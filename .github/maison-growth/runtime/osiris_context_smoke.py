#!/usr/bin/env python3
from __future__ import annotations

import asyncio
import os


async def main() -> None:
    from mcp import ClientSession
    from mcp.client.streamable_http import streamable_http_client

    url=os.environ.get("OSIRIS_MCP_URL","http://osiris-mcp:8790/mcp")
    async with streamable_http_client(url) as (read_stream,write_stream,_):
        async with ClientSession(read_stream,write_stream) as session:
            await session.initialize()
            tools=await session.list_tools()
            names={tool.name for tool in tools.tools}
            if "graph_search" not in names:
                raise SystemExit("osiris_context_smoke_missing_graph_search")
    print("Maison → Osiris read context smoke: OK")


if __name__=="__main__":
    asyncio.run(main())
