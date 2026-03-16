import { WebSocketMessage } from "../types/events";

type MessageHandler = (msg: WebSocketMessage) => void;
type StatusListener = (status: "live" | "connecting" | "disconnected" | "paused") => void;

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private url: string;
  private handlers: Set<MessageHandler> = new Set();
  private statusListeners: Set<StatusListener> = new Set();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 2000;
  private _paused = false;

  constructor(url?: string) {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    this.url = url || `${protocol}//${window.location.host}/ws/live`;
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  get paused(): boolean {
    return this._paused;
  }

  private notifyStatus(status: "live" | "connecting" | "disconnected" | "paused"): void {
    this.statusListeners.forEach((listener) => listener(status));
  }

  connect(): void {
    if (this._paused) return;
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.notifyStatus("connecting");
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.reconnectDelay = 2000;
      this.notifyStatus("live");
    };

    this.ws.onmessage = (event) => {
      try {
        const msg: WebSocketMessage = JSON.parse(event.data);
        this.handlers.forEach((handler) => handler(msg));
      } catch {
        // Ignore malformed messages
      }
    };

    this.ws.onclose = () => {
      if (!this._paused) {
        this.notifyStatus("disconnected");
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  subscribe(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  onStatusChange(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  private scheduleReconnect(): void {
    if (this._paused) return;
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
      this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 30000);
    }, this.reconnectDelay);
  }

  /** User-initiated disconnect — stops auto-reconnect */
  pause(): void {
    this._paused = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
    this.notifyStatus("paused");
  }

  /** User-initiated reconnect */
  resume(): void {
    this._paused = false;
    this.reconnectDelay = 2000;
    this.connect();
  }

  disconnect(): void {
    this.pause();
  }

  sendPing(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send("ping");
    }
  }
}

export const wsManager = new WebSocketManager();
