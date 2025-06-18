import type { Message } from '../conversationStore'

// Helper function to format a message with timestamp
export const formatMessageWithTimestamp = (msg: Message): string => {
  const timestamp = new Date(msg.timestamp).toLocaleString(undefined, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });
  
  const content = typeof msg.content === 'string'
    ? msg.content
    : (msg.content.find(c => c.type === 'text')?.text || '') + ' [image]';

  return `[TIME: ${timestamp}] ${content}`;
};

// Generate context preview in Markdown format
export const generateContextPreview = (
  messages: Message[], 
  input: string, 
  attachment: { file: File; preview: string } | null
): string => {
  // Create system message content
  const systemContent = `# System Message

CRITICAL INSTRUCTION - TIMESTAMPS:
DO NOT MENTION OR USE TIMESTAMP DATA UNLESS EXPLICITLY REQUESTED BY THE USER.
This is a strict requirement. Never reference times, dates, or message history unprompted.
Never include phrases like "based on our conversation at [time]" or "as you mentioned earlier at [time]".
Violation of this instruction is considered a serious error.

You are an AI assistant in a chat application. This is ${messages.length > 0 ?
  "a continuing conversation." : "the beginning of a new conversation."}
  
ONLY IF THE USER EXPLICITLY ASKS about previous messages or time-related information:
1. Each message includes a timestamp in the format [TIME: MM/DD/YYYY, HH:MM:SS AM/PM]
2. When (and only when) the user specifically asks about previous messages from specific times or time ranges, you should:
   - Identify the time references in their query (e.g., "5:30pm", "earlier today", "few minutes ago")
   - Find relevant messages from those times by looking at the timestamps
   - Summarize or quote those messages accurately
   - Include the exact timestamps when referencing messages
3. Handle natural language time expressions only when directly asked, like:
   - "What did we discuss earlier?"
   - "Show me what I said about X around 5pm"
   - "What were we talking about 20 minutes ago?"
   - "What did I ask yesterday?"
  
The current conversation has ${messages.length} previous messages.
The current time is ${new Date().toLocaleString(undefined, {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: true,
  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
})}.
Always maintain context from previous messages in the conversation.`;
  
  let markdownContent = "";
  
  // Add conversation history in reverse chronological order
  const allMessages = [...messages];
  if (input.trim() || attachment) {
    let content: Message['content'];
    if (attachment) {
      content = [{ type: 'text', text: input }];
      content.push({
        type: 'image_url',
        image_url: { url: attachment.preview as string },
      });
    } else {
      content = input;
    }
    allMessages.push({
      id: "preview",
      role: "user",
      content: content,
      timestamp: new Date(),
    } as Message);
  }
  
  // Reverse the array to display newest messages first
  allMessages.reverse().forEach((message, index) => {
    const timestamp = new Date(message.timestamp).toLocaleString(undefined, {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
    
    // The message number is now relative to the reversed order
    markdownContent += `# ${message.role === "user" ? "User" : "Assistant"} Message (Newest #${index + 1})\n`;
    markdownContent += `[TIME: ${timestamp}]\n\n`;
    const content = typeof message.content === 'string'
      ? message.content
      : (message.content.find(c => c.type === 'text')?.text || '') + ' [image attached]';
    markdownContent += `${content}\n\n`;
    markdownContent += "---\n\n";
  });
  
  // Append the system prompt at the end
  markdownContent += systemContent;
  
  return markdownContent;
};

// Parse Markdown context back to API format
export const parseMarkdownContext = (markdown: string): any[] => {
  const messages: any[] = [];
  let currentMessage: any = null;
  let systemMessage: any = null;
  
  // Split by markdown headers
  const sections = markdown.split(/^# /m);
  
  for (const section of sections) {
    if (!section.trim()) continue;
    
    if (section.startsWith("System Message")) {
      // Parse system message
      let content = section.replace("System Message", "").trim();
      content = content.replace(/---\s*$/g, "").trim();
      systemMessage = {
        role: "system",
        content: content
      };
    } else if (section.startsWith("User Message") || section.startsWith("Assistant Message")) {
      // Parse user or assistant message
      const isUser = section.startsWith("User Message");
      const role = isUser ? "user" : "assistant";
      
      // Extract timestamp if present
      const timeMatch = section.match(/\[TIME: (.*?)\]/);
      const timestamp = timeMatch ? timeMatch[1] : null;
      
      // Get content (everything after the timestamp line until the end or ---)
      let content = section;
      if (timestamp) {
        content = content.split(`[TIME: ${timestamp}]`)[1];
      }
      
      // Remove the message number from the first line
      content = content.replace(/^.*Message \d+.*$/m, "").trim();
      
      // Remove trailing separator if present
      content = content.replace(/---\s*$/g, "").trim();
      
      messages.push({
        role: role,
        content: content
      });
    }
  }
  
  // Reverse the messages to get chronological order (oldest to newest)
  const chronologicalMessages = messages.reverse();

  // Ensure system message is first
  const result = systemMessage ? [systemMessage, ...chronologicalMessages] : chronologicalMessages;
  return result;
};