"""
Agent Client - Handles interaction with the Microsoft Foundry agent.

This module contains the core logic for connecting to and communicating with
the agent published in Microsoft Foundry. It uses the OpenAI Responses API
to submit prompts and handle responses.
"""

import os
import logging
import base64
from dataclasses import dataclass, field
from pathlib import PurePosixPath
from typing import List, Dict, Any
from dotenv import load_dotenv


# Import Azure Identity and OpenAI client libraries



# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)


@dataclass
class AgentReply:
    text: str
    images: list[dict[str, str]] = field(default_factory=list)
    image_errors: list[str] = field(default_factory=list)


class AgentClient:
    """Client for interacting with a Microsoft Foundry agent."""
    
    def __init__(self):
        """Initialize the agent client with authentication and endpoint."""
        project_endpoint = os.getenv("PROJECT_ENDPOINT")
        if not project_endpoint:
            raise ValueError("PROJECT_ENDPOINT not found in environment variables") 
        agent_name = os.getenv("AGENT_NAME")
        if not agent_name:
            raise ValueError("AGENT_NAME not found in environment variables")
        self.agent_endpoint = "{}/agents/{}/endpoint/protocols/openai".format(project_endpoint, agent_name)
    


        # Create OpenAI client authenticated with Azure credentials 




        # Container files are served by the project API, not the agent endpoint.
        self.file_client = self.client.copy(
            base_url=f"{project_endpoint.rstrip('/')}/openai/v1",
            set_default_query={}
        )
 

        
        # Maintain conversation history (last 10 exchanges)
        self.conversation_history: List[Dict[str, Any]] = []
        self.max_history = 10
    
    def send_message(self, user_message: str, image_url: str | None = None) -> AgentReply:
        """
        Send a message to the agent and return the response.
        
        Args:
            user_message: The text message from the user
            image_url: Optional validated PNG or JPEG data URL
            
        Returns:
            The agent's response text, attached images, and image retrieval errors
        """
        user_entry = {
            "role": "user",
            "content": user_message if image_url is None else [
                {"type": "input_text", "text": user_message},
                {"type": "input_image", "image_url": image_url}
            ]
        }
        
        try:
            # Initialize assistant message variable
            assistant_message = ""



            # Send prompt with full conversation history and get response
            


            # Get images from response
            images, image_errors = self._get_response_images(response)

            
            # Commit the exchange only after the request succeeds.
            self.conversation_history.append(user_entry)
            self.conversation_history.append({
                "role": "assistant",
                "content": assistant_message
            })
            
            # Count user messages in history to enforce max_history limit
            user_message_count = sum(1 for entry in self.conversation_history if entry["role"] == "user")
            if user_message_count > self.max_history:
                # Remove oldest user-assistant pair
                for i, entry in enumerate(self.conversation_history):
                    if entry["role"] == "user":
                        del self.conversation_history[i:i+2]
                        break

            return AgentReply(
                text=assistant_message,
                images=images,
                image_errors=image_errors
            )
            
        except Exception as e:
            logger.exception("Error communicating with agent")
            raise RuntimeError("Unable to contact the agent. Please try again.") from e


    # Retrieve images from the agent's response
    def _get_response_images(
        self, response: Response
    ) -> tuple[list[dict[str, str]], list[str]]:
        images = []
        errors = []
        seen = set()
        image_types = {
            '.png': ('image/png', b'\x89PNG\r\n\x1a\n'),
            '.jpg': ('image/jpeg', b'\xff\xd8\xff'),
            '.jpeg': ('image/jpeg', b'\xff\xd8\xff'),
        }
        MAX_IMAGE_BYTES = 5 * 1024 * 1024
        for output in response.output:
            if output.type != 'message':
                continue
            for content in output.content:
                if content.type != 'output_text':
                    continue
                for annotation in content.annotations:
                    if annotation.type != 'container_file_citation':
                        continue
                    name = PurePosixPath(annotation.filename).name
                    image_type = image_types.get(PurePosixPath(name).suffix.lower())
                    key = (annotation.container_id, annotation.file_id)
                    if image_type is None or key in seen:
                        continue
                    seen.add(key)
                    try:
                        mime, signature = image_type
                        image_bytes = bytearray()
                        with self.file_client.containers.files.content.with_streaming_response.retrieve(
                            file_id=annotation.file_id,
                            container_id=annotation.container_id,
                            timeout=30
                        ) as file_content:
                            for chunk in file_content.iter_bytes(chunk_size=65536):
                                if len(image_bytes) + len(chunk) > MAX_IMAGE_BYTES:
                                    raise ValueError('The image exceeds 5 MB.')
                                image_bytes.extend(chunk)
                        if not image_bytes.startswith(signature):
                            raise ValueError('The file is not a valid PNG or JPEG image.')
                        encoded = base64.b64encode(image_bytes).decode('ascii')
                        images.append({'name': name, 'dataUrl': f'data:{mime};base64,{encoded}'})
                    except (OpenAIError, ValueError) as error:
                        logger.warning("Unable to retrieve agent image %s: %s", name, error)
                        errors.append(f'Unable to retrieve attached image "{name}". It may have expired or be unavailable.')
        return images, errors
    
    def reset_conversation(self):
        """Clear the conversation history."""
        self.conversation_history = []
