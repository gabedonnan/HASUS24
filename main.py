import websockets
import asyncio

CLIENTS = set()


async def handler(websocket):
    CLIENTS.add(websocket)
    try:
        async for msg in websocket:
            print(msg)
            for client in CLIENTS:
                if client != websocket:
                    await client.send(msg)
    finally:
        CLIENTS.remove(websocket)


async def main():
    async with websockets.serve(handler, "", 6969):
        await asyncio.Future()


if __name__ == "__main__":
    asyncio.run(main())