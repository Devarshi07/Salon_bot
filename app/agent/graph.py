"""
LangGraph ReAct agent graph.
"""
import uuid
from contextlib import asynccontextmanager
from typing import Any

from langchain_core.messages import SystemMessage, HumanMessage, AIMessage, BaseMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode

from app.agent.state import AgentState
from app.agent.tools import make_tools
from app.agent.prompt_builder import build_system_prompt
from app.config import get_settings
from app.models.salon import Salon
from app.models.customer import Customer
from app.models.booking import Booking
from app.models.conversation import Message
from app.utils.logger import get_logger

logger = get_logger(__name__)

MAX_TOOL_CALLS = 5


def _build_graph(tools: list):
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=get_settings().gemini_api_key,
        temperature=0.3,
    )
    llm_with_tools = llm.bind_tools(tools)

    def agent_node(state: AgentState) -> AgentState:
        response = llm_with_tools.invoke(state["messages"])
        return {"messages": [response]}

    def should_continue(state: AgentState) -> str:
        last = state["messages"][-1]
        tool_calls = getattr(last, "tool_calls", None)
        if tool_calls:
            # Check iteration count to prevent infinite loops
            tool_call_count = sum(
                1 for m in state["messages"]
                if hasattr(m, "tool_calls") and m.tool_calls
            )
            if tool_call_count > MAX_TOOL_CALLS:
                logger.warning("Max tool call iterations reached")
                return END
            return "tools"
        return END

    tool_node = ToolNode(tools)

    graph = StateGraph(AgentState)
    graph.add_node("agent", agent_node)
    graph.add_node("tools", tool_node)
    graph.set_entry_point("agent")
    graph.add_conditional_edges("agent", should_continue)
    graph.add_edge("tools", "agent")

    return graph.compile()


def _convert_history(messages: list[Message]) -> list[BaseMessage]:
    result = []
    for msg in messages:
        if msg.role == "user":
            result.append(HumanMessage(content=msg.content))
        elif msg.role == "assistant":
            result.append(AIMessage(content=msg.content))
    return result


async def run_agent(
    salon: Salon,
    customer: Customer,
    upcoming_bookings: list[Booking],
    conversation_history: list[Message],
    user_message: str,
    db_session_factory,
    phone_number_id: str = "",
    access_token: str = "",
) -> str:
    """
    Run the ReAct agent for a single user turn.
    Returns the agent's text response.
    """
    system_prompt = build_system_prompt(salon, customer, upcoming_bookings)

    salon_context = {
        "owner_whatsapp_number": salon.owner_whatsapp_number,
        "notify_on_booking": salon.notify_on_booking,
        "phone_number_id": phone_number_id,
        "access_token": access_token,
        "salon_name": salon.name,
    }

    tools = make_tools(
        salon_id=salon.id,
        google_calendar_id=salon.google_calendar_id or "",
        business_hours=salon.business_hours,
        timezone=salon.timezone,
        db_session_factory=db_session_factory,
        customer_id=customer.id,
        salon_context=salon_context,
    )

    graph = _build_graph(tools)

    history = _convert_history(conversation_history)
    messages = (
        [SystemMessage(content=system_prompt)]
        + history
        + [HumanMessage(content=user_message)]
    )

    result = await graph.ainvoke({"messages": messages})

    # Extract the last AIMessage text
    for msg in reversed(result["messages"]):
        if isinstance(msg, AIMessage) and msg.content:
            return str(msg.content)

    return "I'm sorry, I wasn't able to process your request. Please try again."
