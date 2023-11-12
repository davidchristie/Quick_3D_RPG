import { Message } from "./message";

export type Handler = (message: Message) => void;
