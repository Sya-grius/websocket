class WebSocketManager {
	static #WEBSOCKET_MANAGER_SETTINGS = "WEBSOCKET_MANAGER_SETTINGS" + window.location.host;
	#socket!: WebSocket;
	#settings!: WebSocketManagerSettings;
	constructor(settings?: object) {
		const existingInstance = this.#checkForExistingInstance();
		if (existingInstance) {
			console.warn("WebSocketManager instance already exists. Using the existing instance.");
			return existingInstance; // Return the existing instance if it exists
		}
		this.#settings = settings || JSON.parse(localStorage.getItem(WebSocketManager.#WEBSOCKET_MANAGER_SETTINGS) || "{}");
		this.#socket = new WebSocket("wss://" + window.location.host + (this.#settings["path"] || "/ws"));
		this.#initReader();
	}

	#checkForExistingInstance(): WebSocketManager | null {
		const existingManagers = Object.values(window).filter(v => v instanceof WebSocketManager);
		if (existingManagers.length === 1) {
			return existingManagers[0] as WebSocketManager;
		} else if (existingManagers.length > 1) {
			throw new Error("Multiple WebSocketManager instances found. Page is in a bad state. Please ensure only one instance is created.");
		}
		return null;
	}
	public write(data: string | Blob | ArrayBufferLike | ArrayBufferView): void {
		if (this.#socket.readyState === WebSocket.CONNECTING) {
			console.warn("WebSocket is still connecting. Trying again after a moment...");
			setTimeout(() => {
				this.write(data); // Retry sending data after a short delay
			}, 1_000);
		} else if (this.#socket.readyState === WebSocket.OPEN) {
			this.#socket.send(data);
		} else {
			console.error("WebSocket is not open. Cannot send data.");
		}
	}
	#initReader(): void {
		this.#socket.onmessage = (event: MessageEvent) => {
			const data: WebSocketManagerEventObject = JSON.parse(event.data);
			new WebSocketManagerEvents[data.websocketEventType](data).execute();
		};
	}
}

interface WebSocketManagerSettings {
	path?: string;
}

interface WebSocketManagerEventObject {
	websocketEventType: keyof typeof WebSocketManagerEvents;
	[key: string]: any;
}

namespace WebSocketManagerEvents {
	abstract class AbstractWebSocketEvent {
		constructor(data?: any) {
			Object.assign(this, data);
		}
		abstract execute(): void;
	}
	export class ECHO extends AbstractWebSocketEvent {
		constructor(data: any) {
			super(data);
		}
		execute(): void {
			console.log(this.constructor.name + " event executed:", this);
		}
	}
}
