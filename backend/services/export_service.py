import logging
from models.db_models import ChatSession

logger = logging.getLogger("rag-backend")

def export_session_markdown(session: ChatSession) -> str:
    """
    Compiles chat session messages into a clean Markdown document.
    """
    md = f"# Chat Session: {session.name}\n"
    md += f"Session ID: {session.id}\n"
    md += f"Created: {session.created_at.strftime('%Y-%m-%d %H:%M:%S')}\n"
    md += "="*40 + "\n\n"
    
    for msg in session.messages:
        role_label = "**User**" if msg.role == "user" else "**Assistant**"
        md += f"### {role_label}\n"
        md += f"{msg.content}\n\n"
        
        # Add citations if present
        if msg.role == "assistant" and msg.sources:
            md += "*Sources Cited:*\n"
            for src in msg.sources:
                file = src.get("file", "unknown")
                page = src.get("page", "0")
                md += f"- {file} (Page {page})\n"
            md += "\n"
            
    return md

def export_session_html(session: ChatSession) -> str:
    """
    Compiles chat session messages into an HTML document. 
    MS Word and PDF printers natively render HTML files.
    """
    html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Chat Session: {session.name}</title>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #333; }}
        h1 {{ border-b: 2px solid #eaeaea; padding-bottom: 10px; color: #111; }}
        .meta {{ font-size: 0.9em; color: #666; margin-bottom: 30px; }}
        .message {{ margin-bottom: 25px; padding: 15px; border-radius: 8px; border: 1px solid #e0e0e0; }}
        .user {{ background-color: #f4fdf8; border-left: 4px solid #10b981; }}
        .assistant {{ background-color: #fafafa; border-left: 4px solid #333; }}
        .role {{ font-weight: bold; margin-bottom: 8px; font-size: 0.95em; text-transform: uppercase; color: #555; }}
        .citations {{ font-size: 0.85em; border-top: 1px dashed #ccc; margin-top: 12px; padding-top: 8px; color: #666; }}
    </style>
</head>
<body>
    <h1>Chat Session: {session.name}</h1>
    <div class="meta">
        <strong>Session ID:</strong> {session.id}<br>
        <strong>Created:</strong> {session.created_at.strftime('%Y-%m-%d %H:%M:%S')}
    </div>
"""
    
    for msg in session.messages:
        role_class = "user" if msg.role == "user" else "assistant"
        role_label = "User" if msg.role == "user" else "Assistant"
        
        # Replace newlines with breaks
        content_html = msg.content.replace("\n", "<br>")
        
        html += f"""
    <div class="message {role_class}">
        <div class="role">{role_label}</div>
        <div>{content_html}</div>
"""
        if msg.role == "assistant" and msg.sources:
            html += """
        <div class="citations">
            <strong>Sources Cited:</strong>
            <ul>
"""
            for src in msg.sources:
                file = src.get("file", "unknown")
                page = src.get("page", "0")
                html += f"                <li>{file} (Page {page})</li>\n"
            html += """            </ul>
        </div>
"""
            
        html += "    </div>\n"
        
    html += """</body>
</html>
"""
    return html
