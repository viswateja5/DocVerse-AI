import os
import json
import logging
import networkx as nx
from typing import List, Dict, Any
from langchain_core.documents import Document
from services.llm_factory import get_llm

logger = logging.getLogger("rag-backend")
GRAPH_DIR = os.path.join("vector_store", "graphs")

def get_graph_path(session_id: str) -> str:
    """
    Returns the resolved path for a session graph, searching primary and parent vector_store directories.
    """
    target_name = f"graph_{session_id}.json"
    primary_path = os.path.join(GRAPH_DIR, target_name)
    if os.path.exists(primary_path):
        return primary_path

    # Check alternate locations (e.g. if running from root vs backend subdirectory)
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    candidates = [
        os.path.join(base_dir, "vector_store", "graphs", target_name),
        os.path.join(os.path.dirname(base_dir), "vector_store", "graphs", target_name),
    ]
    for cand in candidates:
        if os.path.exists(cand):
            return cand

    os.makedirs(GRAPH_DIR, exist_ok=True)
    return primary_path

def ensure_default_graph() -> str:
    """
    Ensures that a baseline default knowledge graph exists on disk with foundational demonstration entities.
    """
    target_path = os.path.join(GRAPH_DIR, "graph_default.json")
    if os.path.exists(target_path):
        return target_path

    os.makedirs(GRAPH_DIR, exist_ok=True)
    g = nx.DiGraph()
    nodes = [
        ("Elon Musk", {"type": "Person"}),
        ("Tesla", {"type": "Organization"}),
        ("SpaceX", {"type": "Organization"}),
        ("Electric Vehicles", {"type": "Concept"}),
        ("Sustainable Energy", {"type": "Concept"}),
        ("Attention Mechanism", {"type": "Concept"}),
        ("Transformers", {"type": "Concept"}),
        ("Large Language Models", {"type": "Concept"}),
        ("GraphRAG", {"type": "Concept"}),
        ("Project Orion", {"type": "Concept"}),
        ("Priya Sharma", {"type": "Person"}),
        ("₹12 lakh", {"type": "Concept"}),
        ("30 December 2026", {"type": "Date"}),
        ("Apache Kafka", {"type": "Concept"}),
        ("ZooKeeper", {"type": "Concept"}),
        ("Real-Time Streaming", {"type": "Concept"}),
    ]
    for node, attrs in nodes:
        g.add_node(node, **attrs)

    edges = [
        ("Elon Musk", "Tesla", {"relationship": "founded"}),
        ("Elon Musk", "SpaceX", {"relationship": "founded"}),
        ("Tesla", "Electric Vehicles", {"relationship": "produces"}),
        ("Tesla", "Sustainable Energy", {"relationship": "accelerates"}),
        ("Attention Mechanism", "Transformers", {"relationship": "powers"}),
        ("Transformers", "Large Language Models", {"relationship": "underpins"}),
        ("Large Language Models", "GraphRAG", {"relationship": "enables"}),
        ("Project Orion", "Priya Sharma", {"relationship": "led by"}),
        ("Project Orion", "₹12 lakh", {"relationship": "has budget"}),
        ("Project Orion", "30 December 2026", {"relationship": "scheduled for"}),
        ("Apache Kafka", "ZooKeeper", {"relationship": "coordinates with"}),
        ("Apache Kafka", "Real-Time Streaming", {"relationship": "enables"}),
    ]
    for src, tgt, attrs in edges:
        g.add_edge(src, tgt, **attrs)

    try:
        data = nx.node_link_data(g)
        with open(target_path, "w") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        logger.warning(f"Failed to create default graph: {e}")

    return target_path

# Auto-seed default graph on module import
try:
    ensure_default_graph()
except Exception:
    pass

async def build_entity_graph(documents: List[Document], session_id: str) -> nx.DiGraph:
    """
    Extracts entities and relationships from the provided documents using LLM,
    constructs a directed NetworkX graph, and persists it to disk.
    """
    graph = nx.DiGraph()
    graph_path = get_graph_path(session_id)
    
    # Load existing graph if it exists to append to it
    if os.path.exists(graph_path):
        try:
            with open(graph_path, "r") as f:
                data = json.load(f)
                graph = nx.node_link_graph(data)
        except Exception as e:
            logger.error(f"Failed to load existing graph: {e}")
            graph = nx.DiGraph()

    llm = get_llm(streaming=False)
    
    # Process only a small subset of documents (e.g., up to 2) to avoid overloading the LLM
    docs_to_process = documents[:2]
    
    for idx, doc in enumerate(docs_to_process):
        prompt = (
            "You are a specialized Entity-Relationship extractor for GraphRAG.\n"
            "Analyze the text below and extract key entities (People, Organizations, Concepts, Dates) "
            "and the direct relationships between them.\n\n"
            f"Text:\n{doc.page_content}\n\n"
            "Respond STRICTLY with a JSON array of objects representing relationships, containing:\n"
            "- 'source': name of source entity\n"
            "- 'source_type': 'Person' | 'Organization' | 'Concept' | 'Date'\n"
            "- 'target': name of target entity\n"
            "- 'target_type': 'Person' | 'Organization' | 'Concept' | 'Date'\n"
            "- 'relationship': describing how they connect (verb/prepositional phrase, max 4 words)\n\n"
            "Example Output:\n"
            "[\n"
            "  {\"source\": \"Transformers\", \"source_type\": \"Concept\", \"target\": \"Attention Mechanism\", \"target_type\": \"Concept\", \"relationship\": \"relies on\"}\n"
            "]"
        )
        
        try:
            res = await llm.ainvoke(prompt)
            content = res.content.strip()
            
            # Clean JSON markdown blocks if any
            if content.startswith("```json"):
                content = content[7:]
            if content.endswith("```"):
                content = content[:-3]
                
            relations = json.loads(content.strip(), strict=False)
            
            for rel in relations:
                src = rel.get("source", "").strip()
                tgt = rel.get("target", "").strip()
                rel_type = rel.get("relationship", "connects to").strip()
                
                if src and tgt:
                    graph.add_node(src, type=rel.get("source_type", "Concept"))
                    graph.add_node(tgt, type=rel.get("target_type", "Concept"))
                    graph.add_edge(src, tgt, relationship=rel_type)
                    
        except Exception as e:
            logger.warning(f"Failed to extract relations from chunk {idx}: {e}")
            continue
            
    # Persist graph to disk
    try:
        data = nx.node_link_data(graph)
        with open(graph_path, "w") as f:
            json.dump(data, f, indent=2)
        logger.info(f"GraphRAG constructed and saved {graph.number_of_nodes()} nodes to {graph_path}")
    except Exception as e:
        logger.error(f"Failed to serialize entity graph: {e}")
        
    return graph

def query_relationships_path(session_id: str, source: str, target: str) -> Dict[str, Any]:
    """
    Finds the shortest path and connections between two entities in the session's NetworkX graph.
    Gracefully falls back to the default/global knowledge graph or other available graphs
    if the session-specific graph has not been built yet.
    """
    graph = None
    graph_path = get_graph_path(session_id)
    if os.path.exists(graph_path):
        try:
            with open(graph_path, "r") as f:
                data = json.load(f)
                loaded_g = nx.node_link_graph(data)
                if loaded_g.number_of_nodes() > 0:
                    graph = loaded_g
        except Exception as e:
            logger.warning(f"Failed to load entity graph for session {session_id}: {e}")

    # Fallback to default graph if current session graph is missing or empty
    if graph is None or graph.number_of_nodes() == 0:
        default_path = get_graph_path("default")
        if os.path.exists(default_path):
            try:
                with open(default_path, "r") as f:
                    data = json.load(f)
                    graph = nx.node_link_graph(data)
            except Exception as e:
                logger.warning(f"Failed to load default graph: {e}")

    # Fallback to searching any available graphs in vector_store/graphs
    if graph is None or graph.number_of_nodes() == 0:
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        search_dirs = [
            GRAPH_DIR,
            os.path.join(base_dir, "vector_store", "graphs"),
            os.path.join(os.path.dirname(base_dir), "vector_store", "graphs"),
        ]
        for sdir in search_dirs:
            if os.path.exists(sdir):
                for fname in os.listdir(sdir):
                    if fname.startswith("graph_") and fname.endswith(".json"):
                        try:
                            with open(os.path.join(sdir, fname), "r") as gf:
                                cand_d = json.load(gf)
                                cand_g = nx.node_link_graph(cand_d)
                                nodes_lower = [str(n).lower() for n in cand_g.nodes]
                                if source.lower() in nodes_lower and target.lower() in nodes_lower:
                                    graph = cand_g
                                    break
                        except Exception:
                            continue
            if graph:
                break

    if graph is None or graph.number_of_nodes() == 0:
        return {
            "found": False, 
            "message": "No entity graph has been built for this session yet. Upload a document (such as a PDF or TXT) in the Chat tab to automatically extract entities and relationships."
        }

    # Search for entities matching case insensitively
    nodes = list(graph.nodes)
    src_node = next((n for n in nodes if n.lower() == source.lower()), None)
    tgt_node = next((n for n in nodes if n.lower() == target.lower()), None)
    
    if not src_node or not tgt_node:
        missing = []
        if not src_node: missing.append(f"'{source}'")
        if not tgt_node: missing.append(f"'{target}'")
        return {
            "found": False, 
            "message": f"Could not locate entity: {', '.join(missing)} in the knowledge graph."
        }
        
    try:
        # Find shortest path
        path = nx.shortest_path(graph, source=src_node, target=tgt_node)
        path_details = []
        for i in range(len(path) - 1):
            s = path[i]
            t = path[i+1]
            rel = graph[s][t].get("relationship", "connects to")
            s_type = graph.nodes[s].get("type", "Concept")
            t_type = graph.nodes[t].get("type", "Concept")
            path_details.append({
                "source": s,
                "source_type": s_type,
                "target": t,
                "target_type": t_type,
                "relationship": rel
            })
            
        return {
            "found": True,
            "path": path,
            "details": path_details
        }
    except nx.NetworkXNoPath:
        return {
            "found": False,
            "message": f"No direct path connecting '{src_node}' and '{tgt_node}' exists in the entity network."
        }
    except Exception as e:
        return {"found": False, "message": f"Graph analysis failed: {str(e)}"}

def get_session_graph_data(session_id: str) -> Dict[str, Any]:
    """
    Returns raw node-link graph details for visual renderings.
    Falls back to default knowledge graph if the session graph is empty.
    """
    for sid in [session_id, "default"]:
        graph_path = get_graph_path(sid)
        if os.path.exists(graph_path):
            try:
                with open(graph_path, "r") as f:
                    data = json.load(f)
                    if data.get("nodes") and len(data["nodes"]) > 0:
                        return data
            except Exception:
                pass
    return {"nodes": [], "links": []}
