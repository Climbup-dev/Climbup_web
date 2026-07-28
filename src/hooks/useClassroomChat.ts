import { useState, useEffect, useCallback, useRef } from "react";

export type ConnectionStatus = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR';

export interface ChatMessage {
  id: number;
  type: 'chat' | 'system';
  sender?: string;
  content: string;
  timestamp?: string;
  isAi?: boolean;
  isOwn?: boolean;
}

interface UseClassroomChatOptions {
  classroomId: string;
  mode: 'group' | 'personal';
  studentId?: string;
  studentName?: string;
  onMessageReceived: (msg: ChatMessage) => void;
  onBoardUpdate?: (content: string) => void;
}

export function useClassroomChat({ classroomId, mode, studentId, studentName, onMessageReceived, onBoardUpdate }: UseClassroomChatOptions) {
  const [status, setStatus] = useState<ConnectionStatus>('DISCONNECTED');
  const [closedInfo, setClosedInfo] = useState({ isClosed: false, message: '' });
  
  const ws = useRef<WebSocket | null>(null);
  const isPermanentlyClosed = useRef(false);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!studentId || !studentName || !classroomId) return;
    
    // We use a local variable to prevent older closures from reconnecting
    let isSubscribed = true;

    function scheduleReconnect() {
      if (!isSubscribed) return;
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }

      // Exponential backoff: max delay 10 seconds
      const delay = Math.min(1000 * (2 ** reconnectAttempts.current), 10000);
      reconnectAttempts.current += 1;

      console.log(`WebSocket disconnected. Reconnecting in ${delay}ms...`);
      reconnectTimer.current = setTimeout(() => {
        if (isSubscribed) connect();
      }, delay);
    }

    function connect() {
      if (!isSubscribed) return;
      if (ws.current) {
        ws.current.onclose = null;
        ws.current.close();
      }

      // We use a small timeout to avoid the "Calling setState synchronously within an effect" warning
      setTimeout(() => {
        if (isSubscribed) setStatus('CONNECTING');
      }, 0);
      
      const baseUrl = process.env.NEXT_PUBLIC_CLASS_AGENT_WS_URL || "wss://class-agent-1043127428629.asia-south1.run.app";
      const endpoint = mode === 'group' ? '/ws/classroom/' : '/ws/personal/';
      // Ensure studentId and studentName exist here (already checked at the top of useEffect)
      const wsUrl = `${baseUrl}${endpoint}${classroomId}?user_id=${encodeURIComponent(studentId as string)}&student_name=${encodeURIComponent(studentName as string)}`;

      try {
        const websocket = new WebSocket(wsUrl);
        ws.current = websocket;

        websocket.onopen = () => {
          if (!isSubscribed) return;
          setStatus('CONNECTED');
          reconnectAttempts.current = 0;
        };

        websocket.onmessage = (event) => {
          if (!isSubscribed) return;
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'error') {
              setClosedInfo({ isClosed: true, message: data.content });
              isPermanentlyClosed.current = true;
              return;
            }
            
            if (data.type === 'teaching') {
              if (data.board_content && onBoardUpdate) {
                onBoardUpdate(data.board_content);
              }
              if (data.chat_content && data.chat_content !== "SILENCE") {
                onMessageReceived({
                  id: Date.now() + Math.random(),
                  type: 'chat',
                  sender: data.sender || 'AI Teacher',
                  content: data.chat_content,
                  timestamp: data.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  isAi: true,
                  isOwn: false
                });
              }
            } else if (data.type === 'chat' || data.type === 'system') {
              const isSelf = data.sender === studentName;
              const isAi = data.sender?.toLowerCase().includes("ai") || data.sender === "System" || data.sender === "AI Teacher";

              onMessageReceived({
                id: Date.now() + Math.random(),
                type: data.type,
                sender: data.sender || 'System',
                content: data.content,
                timestamp: data.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isAi: isAi && !isSelf,
                isOwn: isSelf
              });
            }
          } catch {
            console.error("Failed to parse WebSocket message:", event.data);
          }
        };

        websocket.onclose = (event) => {
          if (!isSubscribed) return;
          setStatus('DISCONNECTED');
          ws.current = null;
          
          if (event.code === 1008) {
            alert("🚨 Aapko AI Teacher ne class se bahar nikal diya hai badtameezi ke liye!");
            window.location.href = "/";
            return;
          }

          if (!isPermanentlyClosed.current) {
            scheduleReconnect();
          }
        };

        websocket.onerror = () => {
          if (!isSubscribed) return;
          setStatus('ERROR');
        };

      } catch {
        if (!isSubscribed) return;
        setStatus('ERROR');
        scheduleReconnect();
      }
    }

    connect();

    return () => {
      isSubscribed = false;
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }
      if (ws.current) {
        ws.current.onclose = null; 
        ws.current.close();
        ws.current = null;
      }
    };
  }, [classroomId, mode, studentId, studentName, onMessageReceived, onBoardUpdate]);
  const sendMessage = useCallback((content: string) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      // Backend expects raw text
      ws.current.send(content);
    } else {
      console.warn("WebSocket is not connected. Cannot send message.");
    }
  }, []);

  return {
    sendMessage,
    status,
    isConnected: status === 'CONNECTED',
    closedInfo
  };
}

