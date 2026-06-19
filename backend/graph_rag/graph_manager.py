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
    os.makedirs(GRAPH_DIR, exist_ok=True)
    return os.path.join(GRAPH_DIR, f"graph_{session_id}.json")

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
    
    # Process only a subset of documents (e.g., up to 10) to avoid overloading the LLM
    docs_to_process = documents[:10]
    
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
    """
    graph_path = get_graph_path(session_id)
    if not os.path.exists(graph_path):
        return {"found": False, "message": "No entity graph has been built for this session yet."}
        
    try:
        with open(graph_path, "r") as f:
            data = json.load(f)
            graph = nx.node_link_graph(data)
    except Exception as e:
        return {"found": False, "message": f"Failed to load entity graph: {str(e)}"}
        
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
    """
    graph_path = get_graph_path(session_id)
    if not os.path.exists(graph_path):
        return {"nodes": [], "links": []}
        
    try:
        with open(graph_path, "r") as f:
            return json.load(f)
    except Exception:
        return {"nodes": [], "links": []}
