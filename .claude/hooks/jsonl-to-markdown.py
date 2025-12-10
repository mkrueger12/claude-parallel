#!/usr/bin/env python3
"""
JSONL to Markdown Converter

Converts Claude Code transcript JSONL files to readable markdown format
for inclusion in GitHub PR comments.

Usage:
    python3 jsonl-to-markdown.py <input.jsonl> <output.md>
"""

import sys
import json
import argparse
from typing import List, Dict, Any


MAX_CHARACTERS = 60000  # GitHub comment limit is 65535, leave buffer


def format_tool_use(content: List[Dict[str, Any]]) -> str:
    """Format tool_use content blocks."""
    output = []
    for block in content:
        if block.get("type") == "tool_use":
            tool_name = block.get("name", "unknown")
            tool_input = block.get("input", {})
            output.append(f"**Tool: {tool_name}**")
            # Format tool input nicely, truncating if too long
            input_str = json.dumps(tool_input, indent=2)
            if len(input_str) > 500:
                input_str = input_str[:500] + "\n... (truncated)"
            output.append(f"```json\n{input_str}\n```")
        elif block.get("type") == "text":
            text = block.get("text", "")
            if text.strip():
                output.append(text)
    return "\n\n".join(output)


def format_tool_result(content: List[Dict[str, Any]]) -> str:
    """Format tool_result content blocks."""
    output = []
    for block in content:
        if block.get("type") == "tool_result":
            tool_use_id = block.get("tool_use_id", "unknown")
            is_error = block.get("is_error", False)
            result_content = block.get("content", "")

            # Handle different result content types
            if isinstance(result_content, list):
                result_text = ""
                for item in result_content:
                    if isinstance(item, dict) and item.get("type") == "text":
                        result_text += item.get("text", "")
                result_content = result_text

            status = "ERROR" if is_error else "Result"
            output.append(f"**{status}:**")

            # Truncate very long results
            if len(result_content) > 1000:
                result_content = result_content[:1000] + "\n... (truncated)"

            output.append(f"```\n{result_content}\n```")
    return "\n\n".join(output)


def format_message(msg: Dict[str, Any]) -> str:
    """Format a single message from the JSONL transcript."""
    msg_type = msg.get("type")

    if msg_type == "user":
        content = msg.get("content", [])
        text_parts = []
        for block in content:
            if isinstance(block, dict) and block.get("type") == "text":
                text_parts.append(block.get("text", ""))
            elif isinstance(block, str):
                text_parts.append(block)

        text = "\n".join(text_parts)
        return f"### User:\n\n{text}\n"

    elif msg_type == "assistant":
        content = msg.get("content", [])
        formatted = format_tool_use(content)
        return f"### Claude:\n\n{formatted}\n"

    elif msg_type == "tool_result":
        content = msg.get("content", [])
        formatted = format_tool_result(content)
        return f"{formatted}\n"

    elif msg_type == "command-message":
        # These are system messages, format them differently
        content = msg.get("content", "")
        return f"_System: {content}_\n"

    return ""


def convert_jsonl_to_markdown(input_file: str, output_file: str) -> None:
    """Convert JSONL transcript to markdown format."""

    messages = []
    total_chars = 0
    truncated = False

    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            for line_num, line in enumerate(f, 1):
                line = line.strip()
                if not line:
                    continue

                try:
                    msg = json.loads(line)
                    formatted = format_message(msg)

                    # Check if we're approaching the character limit
                    if total_chars + len(formatted) > MAX_CHARACTERS:
                        truncated = True
                        break

                    if formatted:
                        messages.append(formatted)
                        total_chars += len(formatted)

                except json.JSONDecodeError as e:
                    print(f"Warning: Skipping invalid JSON on line {line_num}: {e}", file=sys.stderr)
                    continue

    except FileNotFoundError:
        print(f"Error: Input file '{input_file}' not found", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error reading input file: {e}", file=sys.stderr)
        sys.exit(1)

    # Write markdown output
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write("# Verification Conversation\n\n")
            f.write("This is the complete conversation from Claude's verification process.\n\n")
            f.write("---\n\n")

            for msg in messages:
                f.write(msg)
                f.write("\n")

            if truncated:
                f.write("\n---\n\n")
                f.write("_Note: Conversation truncated due to length. ")
                f.write("Download the full transcript artifact for the complete conversation._\n")

        print(f"Successfully converted {input_file} to {output_file}", file=sys.stderr)
        print(f"Total characters: {total_chars}", file=sys.stderr)
        if truncated:
            print("Warning: Output was truncated to fit GitHub comment limits", file=sys.stderr)

    except Exception as e:
        print(f"Error writing output file: {e}", file=sys.stderr)
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(
        description='Convert Claude Code JSONL transcript to Markdown',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    parser.add_argument('input', help='Input JSONL file path')
    parser.add_argument('output', help='Output Markdown file path')

    args = parser.parse_args()

    convert_jsonl_to_markdown(args.input, args.output)


if __name__ == '__main__':
    main()
