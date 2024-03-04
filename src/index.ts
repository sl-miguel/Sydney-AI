import WebSocket from "ws";
import { v4 as uuidv4 } from "uuid";
import "dotenv/config";

import { SydnetConversation, SydneyProps } from "./types/sydney";

class Sydney {
  host: string;
  cookie: string;
  char: string;
  // websocket: null;

  constructor(options: SydneyProps = { cookie: process.env.COPILOT_COOKIE! }) {
    this.host = "https://copilot.microsoft.com";
    this.cookie = options.cookie;
    this.char = "";
    // this.websocket = null;
  }

  async create() {

    const headers = {
      Cookie: this.cookie,
      "x-ms-client-request-id": crypto.randomUUID(),
      "x-ms-useragent": "azsdk-js-api-client-factory/1.0.0-beta.1 core-rest-pipeline/1.12.3 OS/Win32",
    };

    const response = await fetch(`${this.host}/turing/conversation/create`, { headers });
    const body = await response.json();
    
    const conversation: SydnetConversation = {
      clientId: body.clientId,
      conversationId: body.conversationId,
      conversationSignature: response.headers.get("x-sydney-conversationsignature")!,
      secAccessToken: response.headers.get("x-sydney-encryptedconversationsignature")!,
      invocationId: 0,
    }
    
    console.log(body);
    console.log(conversation);
    return conversation;
  }

  async prompt(context: SydnetConversation, message: string) {
    const uuid = uuidv4(); 
    return {
      arguments: [
        {
          source: "cib",
          optionsSets: ["nlu_direct_response_filter", "deepleo", "disable_emoji_spoken_text", "responsible_ai_policy_235", "enablemm", "dv3sugg", "flxvsearch", "autosave", "iyxapbing", "iycapbing", "h3precise", "uquopt", "sunoupsell", "rctechalwlst", "gamaxinvoc", "gndbfptlw", "codeintfile", "gptv1desc2", "noknowimg", "ldsummary", "ldqa", "sdretrieval", "clgalileo", "gencontentv3" ],
          allowedMessageTypes: ["Chat", "InternalSearchQuery"],
          sliceIds: [ "tnamobcf", "adssqovr", "inlineadsv2", "inlineadscont", "1542", "1211enbackfix", "cmcallcf", "ctvismctrl", "sydtransview", "exptonecf", "bgstream", "abv2cl", "1215persc", "0212boptpsc", "14bicfluxv2", "111mem", "116langwb", "0124dv1s0", "0126hpctas0", "1pgptwdess0"],
          verbosity: "verbose",
          scenario: "SERP",
          plugins: [{ id: "c310c353-b9f0-4d76-ab0d-1dd5e979cf68", category: 1 }],
          isStartOfSession: context.invocationId === 0,
          requestId: uuid,
          message: {
            timestamp: new Date().toISOString(),
            author: "user",
            inputMethod: "Keyboard",
            text: message,
            messageType: "Chat",
            requestId: uuid,
            messageId: uuid,
          },
          tone: "Precise",
          conversationSignature: context.conversationSignature,
          participant: { id: context.clientId },
          spokenTextMode: "None",
          conversationId: context.conversationId,
        },
      ],
      invocationId: context.invocationId.toString(),
      target: "chat",
      type: 4,
    };
  }

  async invoke(text: string) {
    return new Promise(async (resolve, reject) => {
      const conversation = await this.create();
      const websocket = new WebSocket(`wss://sydney.bing.com/sydney/ChatHub?sec_access_token=${encodeURIComponent(conversation.secAccessToken)}`);

      websocket.on("message", async (data) => {

        const [response] = data.toString().split("");
        const event = JSON.parse(response);

        if (response === "{}") {
          websocket.send('{"type":6}');

          const ouais = await this.prompt(conversation, text);
          websocket.send(`${JSON.stringify(ouais)}`);
        }

        switch (event.type) {

          case 1: {
            console.log("[Copilot] Typing.");
            break;
          }

          case 2: {
            console.log("[Copilot] Finished."); 
            const chat  = event.item.messages;
            const messages = chat.filter((message: any) => message.author === "bot");
            const lastMessage = messages[messages.length - 1];
            resolve(lastMessage.text);
            websocket.close();
            break;
          }

          case 6: {
            console.log("[Copilot] Handshaking.");
            websocket.send('{"type":6}');
            break;
          } 

          default: {
            console.log("[Copilot] Something when wrong.");
            break;
          }
        }

      });

      websocket.on("open", () => {
        console.debug("[WebSocket] Handshake.");
        websocket.send('{"protocol":"json","version":1}');
      });

    });
  }

}

const model = new Sydney();
let data = await model.invoke(`Ne pas inclure d'explications, fournir uniquement la réponse: Combien d'objets sont présents dans le jeu "Mario Kart 8 Deluxe" ?`);
console.log(data);