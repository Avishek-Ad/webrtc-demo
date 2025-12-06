from channels.generic.websocket import AsyncWebsocketConsumer
import json
from urllib.parse import parse_qs

CURRENT_USERS = set()


class SignalingConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # id from ?id={}
        qs = parse_qs(self.scope["query_string"].decode())
        self.user_id = qs.get("id", [None])[0]

        print("Connected to : ", self.user_id)

        CURRENT_USERS.add(self.user_id)

        self.room_group_name = 'public'

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

        await self.channel_layer.group_send(
            self.room_group_name, 
            {
                "type": "user_list",
                "users": list(CURRENT_USERS)
            }
        )
    
    async def disconnect(self, close_code):
        CURRENT_USERS.discard(self.user_id)

        await self.channel_layer.group_send(
            self.room_group_name, 
            {
                "type": "user_list",
                "users": list(CURRENT_USERS)
            }
        )

        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    
    async def receive(self, text_data):
        received_data = json.loads(text_data)
        
        await self.channel_layer.group_send(
            self.room_group_name, 
            {
                'type': 'message_sender',
                'message': received_data
            }
        )

    async def message_sender(self, event):
        message = event['message']
        await self.send(text_data=json.dumps(message))

    async def user_list(self, event):
        users = event['users']
        await self.send(text_data=json.dumps({
            "type": "current-users",
            "users": users
        }))