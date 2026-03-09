import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Mail, User, ShieldCheck, ArrowLeft } from "lucide-react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const status = searchParams.get("status");
  const userParam = searchParams.get("user");
  
  const [formData, setFormData] = useState({
    iptv_username: userParam || "",
    customer_email: "",
    customer_name: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [registeredUser, setRegisteredUser] = useState<any>(null);

  // Check if current user is admin
  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      
      const { data } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'
      });
      
      return data || false;
    },
  });


  // Function to search for user
  const searchUser = async (username: string) => {
    if (!username.trim()) {
      setRegisteredUser(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("iptv_users")
        .select("*")
        .eq("username", username.trim())
        .eq("is_active", true)
        .single();

      if (error || !data) {
        setRegisteredUser(null);
        return;
      }

      setRegisteredUser(data);
      setFormData(prev => ({
        ...prev,
        customer_email: data.customer_email || "",
        customer_name: data.customer_name || "",
      }));
    } catch (error) {
      console.error("Search error:", error);
      setRegisteredUser(null);
    }
  };

  // Debounced search when username changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchUser(formData.iptv_username);
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [formData.iptv_username]);

  // Initial search if user param exists
  useEffect(() => {
    if (userParam) {
      searchUser(userParam);
    }
  }, [userParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.iptv_username || !registeredUser) {
      toast({ title: "Erro", description: "Digite um usuário válido cadastrado no sistema", variant: "destructive" });
      return;
    }

    // Process payment for registered user
    setIsLoading(true);
    try {
      const response = await supabase.functions.invoke('create-payment', {
        body: {
          iptv_username: formData.iptv_username,
          customer_email: formData.customer_email,
          customer_name: formData.customer_name,
          registered_user_payment: true,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Erro ao criar pagamento");
      }

      if (response.data?.initPoint) {
        window.location.href = response.data.initPoint;
      } else {
        throw new Error("Link de pagamento não recebido");
      }

    } catch (error: any) {
      console.error(error);
      toast({
        title: "Erro ao processar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-900 border-green-500/30">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-8 h-8 text-green-400" />
            </div>
            <CardTitle className="text-2xl text-green-400">Pagamento Aprovado!</CardTitle>
            <CardDescription className="text-slate-400">
              Seu plano IPTV foi renovado com sucesso e os créditos já foram adicionados.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button className="w-full bg-slate-800 hover:bg-slate-700" onClick={() => window.location.href = '/checkout'}>
              Fazer nova renovação
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))] flex flex-col items-center justify-center p-4">
      <div className="text-center mb-8 relative">
        {/* Admin Back Button */}
        {isAdmin && (
          <Button
            onClick={() => navigate('/admin')}
            variant="ghost"
            className="absolute left-0 top-0 text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Admin
          </Button>
        )}
        <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-2">
          Renove seu IPTV
        </h1>
        <p className="text-slate-400">Rápido, seguro e ativação imediata</p>
      </div>

      <Card className="w-full max-w-xl bg-slate-900/80 backdrop-blur-xl border-slate-800 shadow-2xl">
        <form onSubmit={handleSubmit}>
          <CardContent className="p-6 space-y-6">
            {/* Show registered user info if available */}
            {registeredUser && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-4">
                <h3 className="text-green-400 font-semibold mb-2">✓ Usuário Encontrado</h3>
                <p className="text-slate-300 text-sm">
                  Valor a pagar: <span className="text-green-400 font-bold">R$ {Number(registeredUser.amount_due).toFixed(2)}</span>
                </p>
                {registeredUser.customer_name && (
                  <p className="text-slate-400 text-sm">Cliente: {registeredUser.customer_name}</p>
                )}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <Label htmlFor="iptv_username" className="text-slate-300">Seu Usuário IPTV *</Label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <Input
                    id="iptv_username"
                    required
                    value={formData.iptv_username}
                    onChange={e => setFormData({ ...formData, iptv_username: e.target.value })}
                    className="pl-10 bg-slate-800/50 border-slate-700 text-white"
                    placeholder="Digite seu login do IPTV"
                    disabled={!!registeredUser} // Disable if it's a registered user
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="customer_name" className="text-slate-300">Seu Nome {registeredUser ? '' : '(Opcional)'}</Label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <Input
                    id="customer_name"
                    value={formData.customer_name}
                    onChange={e => setFormData({ ...formData, customer_name: e.target.value })}
                    className="pl-10 bg-slate-800/50 border-slate-700 text-white"
                    placeholder="Como gostaria de ser chamado?"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="customer_email" className="text-slate-300">Seu E-mail {registeredUser ? '' : '(Opcional)'}</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <Input
                    id="customer_email"
                    type="email"
                    value={formData.customer_email}
                    onChange={e => setFormData({ ...formData, customer_email: e.target.value })}
                    className="pl-10 bg-slate-800/50 border-slate-700 text-white"
                    placeholder="Para receber o comprovante"
                  />
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="p-6 pt-0">
            <Button
              type="submit"
              disabled={isLoading || !registeredUser}
              className="w-full h-12 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
            >
              {isLoading ? "Gerando pagamento..." : registeredUser ? `Pagar R$ ${Number(registeredUser.amount_due).toFixed(2)} e Renovar Agora` : 'Digite um usuário válido'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}