#!/usr/bin/env python3
from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Mapping, Optional, Sequence


class AdapterUnavailable(RuntimeError):
    pass


@dataclass(frozen=True)
class EntityObservation:
    text: str
    label: str
    score: float
    start: int
    end: int


class GLiNERAdapter:
    """Optional local entity extractor.

    A concrete model name must be configured by the operator after licence/model
    verification. Extracted entities are hypotheses/structure, never canonical facts.
    """

    def __init__(self, *, model_name: str, labels: Sequence[str]):
        if not model_name.strip():
            raise ValueError("model_name_required")
        if not labels:
            raise ValueError("labels_required")
        self.model_name=model_name
        self.labels=tuple(labels)
        self._model=None

    def available(self) -> bool:
        try:
            import gliner  # noqa:F401
            return True
        except Exception:
            return False

    def _load(self):
        if self._model is not None:
            return self._model
        try:
            from gliner import GLiNER
        except Exception as exc:
            raise AdapterUnavailable("gliner_not_available") from exc
        self._model=GLiNER.from_pretrained(self.model_name)
        return self._model

    def extract(self, text: str, *, threshold: float=0.5) -> tuple[EntityObservation,...]:
        if not 0 <= threshold <= 1:
            raise ValueError("threshold_must_be_0_1")
        model=self._load()
        raw=model.predict_entities(text,self.labels,threshold=threshold)
        out=[]
        for item in raw:
            out.append(EntityObservation(
                text=str(item.get("text","")),
                label=str(item.get("label","")),
                score=float(item.get("score",0.0)),
                start=int(item.get("start",0)),
                end=int(item.get("end",0)),
            ))
        return tuple(out)


@dataclass(frozen=True)
class ChangePointResult:
    breakpoints: tuple[int,...]
    algorithm: str
    model: str


class RupturesAdapter:
    """Optional change-point detector for aggregate numerical histories."""

    def available(self) -> bool:
        try:
            import ruptures  # noqa:F401
            return True
        except Exception:
            return False

    def detect(
        self,
        values: Sequence[float],
        *,
        algorithm: str="pelt",
        model: str="rbf",
        penalty: Optional[float]=None,
        n_bkps: Optional[int]=None,
    ) -> ChangePointResult:
        if len(values) < 3:
            return ChangePointResult((),algorithm,model)
        try:
            import numpy as np
            import ruptures as rpt
        except Exception as exc:
            raise AdapterUnavailable("ruptures_or_numpy_not_available") from exc
        signal=np.asarray(values,dtype=float)
        if algorithm=="pelt":
            if penalty is None or penalty <= 0:
                raise ValueError("pelt_requires_positive_penalty")
            result=rpt.Pelt(model=model).fit(signal).predict(pen=penalty)
        elif algorithm=="binseg":
            if n_bkps is None or n_bkps < 1:
                raise ValueError("binseg_requires_n_bkps")
            result=rpt.Binseg(model=model).fit(signal).predict(n_bkps=n_bkps)
        else:
            raise ValueError("unsupported_algorithm")
        # Ruptures includes the terminal sample index; that is not a regime-change point.
        terminal=len(values)
        return ChangePointResult(tuple(int(x) for x in result if int(x) != terminal),algorithm,model)
