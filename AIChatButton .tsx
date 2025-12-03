import { useState } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function AIChatButton({ onTransactionCreated }: { onTransactionCreated?: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Olá! 👋 Sou o FinBot, seu assistente financeiro. Me conte sobre seus gastos ou receitas e eu vou registrar para você! Por exemplo: 'Gastei R$50 no supermercado' ou 'Recebi R$3000 de salário'.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !user) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("finance-chat", {
        body: {
          messages: [...messages.slice(1), userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          userId: user.id,
        },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: "assistant",
        content: data.message || "Desculpe, não consegui processar sua mensagem.",
      };
      setMessages((prev) => [...prev, assistantMessage]);

      if (data.transaction_created && onTransactionCreated) {
        onTransactionCreated();
        toast({
          title: "Transação registrada!",
          description: "Sua transação foi salva com sucesso.",
        });
      }
    } catch (error: any) {
      console.error("Chat error:", error);
      
      let errorMessage = "Desculpe, ocorreu um erro. Tente novamente.";
      if (error.message?.includes("429")) {
        errorMessage = "Muitas mensagens enviadas. Aguarde um momento.";
      } else if (error.message?.includes("402")) {
        errorMessage = "Créditos de IA insuficientes.";
      }
      
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: errorMessage },
      ]);
      
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg z-50",
          "bg-primary hover:bg-primary/90 transition-all duration-300",
          "animate-glow-pulse"
        )}
        size="icon"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </Button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-[380px] max-w-[calc(100vw-3rem)] h-[500px] max-h-[calc(100vh-8rem)] glass-card rounded-2xl shadow-2xl z-50 flex flex-col animate-scale-in overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-border/50 bg-primary/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">FinBot</h3>
                <p className="text-xs text-muted-foreground">Seu assistente financeiro</p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-2 text-sm",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-secondary/50 text-foreground rounded-bl-sm"
                    )}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-secondary/50 rounded-2xl rounded-bl-sm px-4 py-3">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t border-border/50">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite sua mensagem..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button onClick={sendMessage} disabled={isLoading || !input.trim()} size="icon">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
