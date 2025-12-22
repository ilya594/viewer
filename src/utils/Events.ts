export class EventHandler {
    private readonly events: Record<string, Function[]> = {};

    public dispatchEvent = (eventName: string, data: any = null): void => {
        const event = this.events[eventName];
        if (event) {
            const handlers = [...event];
            handlers.forEach((handler: Function) => {
                handler.call(null, data);
            });
        }
    }

    public addEventListener(eventName: string, handler: Function): number {
        if (!this.events[eventName]) {
            this.events[eventName] = [];
        }
        return this.events[eventName].push(handler);
    }

    public addSingleEventListener(eventName: string, handler: Function): number {
        const onceHandler = (data: any) => {
            handler.call(null, data);
            this.removeSpecificEventListener(eventName, onceHandler);
        };
        return this.addEventListener(eventName, onceHandler);
    }

    public removeSpecificEventListener(eventName: string, handlerToRemove: Function): boolean {
        if (!this.events[eventName]) {
            return false;
        }
        const index = this.events[eventName].findIndex(handler => handler === handlerToRemove);
        if (index !== -1) {
            this.events[eventName].splice(index, 1);
            return true;
        }
        return false;
    }

    public removeEventListener(eventName: string): boolean {
        return delete this.events[eventName];
    }
}

export default new EventHandler();

export const USER_PROCEEDED = 'user_proceeded';

export const STREAM_RECEIVED = 'stream_received';
export const STREAM_BALANCED = 'stream_balanced';
export const ACTIVE_STREAM_RECEIVED = 'active_stream_received';
export const STREAMS_COUNT_CHANGED = 'streams_count_changed';
export const STREAM_LOST = 'stream_lost';
export const STREAM_LOST_GENERIC = 'stream_lost_generic';
export const STREAM_SWITCHED = 'stream_switched';
export const PEER_CONNECTED = 'peer_connected';
export const PEER_DISCONNECTED = 'peer_disconnected';
export const PEER_CLOSED = 'peer_closed';
export const PEER_ERROR = 'peer_error';
export const PEER_RECONNECT_FAILED = 'peer_reconnect_failed';
export const NO_STREAMS_AVAILABLE = 'no_streams_available';
export const NETWORK_ONLINE = 'network_online';
export const NETWORK_OFFLINE = 'network_offline';
export const MANUAL_RECONNECT_REQUIRED = 'manual_reconnect_required';


export const FACE_DETECTED = 'face_detected';
export const FACE_RECOGNIZED = 'face_recognized';


export const MOTION_DETECTOR_STATE_CHANGED = 'motion_detector_state_changed';
export const MOTION_DETECTED = 'motion_detected';
export const MOTION_DETECTION_STARTED = 'motion_detection_started';
export const MOTION_DETECTION_FINISHED = 'motion_detection_finished';

export const SNAPSHOT_SEND_HOMIE = 'snapshot_send_homie';


export const CHANGE_TRACE_VISIBILITY = 'change_trace_visibility';

export const NETWORK_FOLDERS_LOAD_END = 'network_folders_loaded';
export const NETWORK_SNAPSHOT_LOAD_START = 'network_snapshot_load_start';
export const NETWORK_SNAPSHOT_LOAD_END = 'network_snapshot_load_end';

export const NETWORK_AUTH_SUCCESS = 'network_auth_success';

export const CONSOLE_EXECUTE_COMMAND = 'console_execute_command';

export const VOLUME_ADJUST_SPREAD = 'volume_adjust_spread';

export const MOBILE_SWIPE_RIGHT = 'mobile_swipe_right';

export const MATRIX_SCREEN_STATE_CHANGED = 'matrix_screen_state_changed';

export const COLOR_CURVES_STATE_CHANGED = 'color_curves_state_changed';