#!/usr/bin/env python3
from __future__ import annotations

from typing import Sequence


class LocalEmbeddingUnavailable(RuntimeError):
    pass


class MultilingualE5SmallProvider:
    """Pinned local multilingual embedding provider for Maison Semantic Memory.

    The model card requires query:/passage: prefixes for asymmetric retrieval.
    Loading is lazy so repository validation never downloads model weights.
    """

    model_name="intfloat/multilingual-e5-small"
    revision="03415a4be176a1620747c692ed433219fabc3def"
    model_id=f"{model_name}@{revision}"
    dimensions=384

    def __init__(self, *, device: str="cpu"):
        self.device=device
        self._model=None

    @staticmethod
    def prepare_query(text: str) -> str:
        clean=text.strip()
        if not clean:
            raise ValueError("embedding_text_required")
        return "query: " + clean

    @staticmethod
    def prepare_document(text: str) -> str:
        clean=text.strip()
        if not clean:
            raise ValueError("embedding_text_required")
        return "passage: " + clean

    def available(self) -> bool:
        try:
            import sentence_transformers  # noqa:F401
            return True
        except Exception:
            return False

    def _load(self):
        if self._model is not None:
            return self._model
        try:
            from sentence_transformers import SentenceTransformer
        except Exception as exc:
            raise LocalEmbeddingUnavailable("sentence_transformers_not_available") from exc
        self._model=SentenceTransformer(
            self.model_name,
            revision=self.revision,
            device=self.device,
        )
        return self._model

    def _encode(self, prepared: str) -> Sequence[float]:
        model=self._load()
        vector=model.encode(prepared,normalize_embeddings=True)
        values=vector.tolist() if hasattr(vector,"tolist") else list(vector)
        if len(values) != self.dimensions:
            raise LocalEmbeddingUnavailable(
                f"unexpected_embedding_dimensions:{len(values)}!={self.dimensions}"
            )
        return tuple(float(x) for x in values)

    def embed_query(self, text: str) -> Sequence[float]:
        return self._encode(self.prepare_query(text))

    def embed_document(self, text: str) -> Sequence[float]:
        return self._encode(self.prepare_document(text))
