import { MessageType, MessageBase } from './MessageBase';

/*Triggers the syncsaberservice to start doing syncs.  Setting SyncOnlyID to null will sync all feeds, specifying an ID will sync only that feed */
export class ClientSyncSaberSync extends MessageBase {
    Type: MessageType = MessageType.SyncSaberSync;

    SyncOnlyID: string;
}
