type SydneyProps = {
    cookie: string;
}

type SydnetConversation = {
    clientId: string;
    conversationId: string;
    conversationSignature: string;
    secAccessToken: string;
    invocationId: number;
}


export { SydneyProps, SydnetConversation };