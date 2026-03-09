import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Tv, ArrowRight, ExternalLink } from "lucide-react";

export default function Success() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const userParam = searchParams.get("user");
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Premium Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(34,197,94,0.1),transparent_50%)]" />
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[100px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[100px] rounded-full animate-pulse [animation-delay:1s]" />
      
      {/* Animated Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20" />

      <Card 
        className={`w-full max-w-lg bg-slate-900/40 backdrop-blur-2xl border-white/10 shadow-[0_0_80px_-20px_rgba(34,197,94,0.4)] transition-all duration-1000 transform ${
          isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-12 opacity-0 scale-95'
        }`}
      >
        <CardHeader className="text-center pt-12 pb-6">
          <div className="relative mx-auto mb-8">
            {/* Animated Ring */}
            <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping" />
            <div className="relative w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,0.5)]">
              <ShieldCheck className="w-12 h-12 text-white" />
            </div>
            
            {/* Decorations */}
            <span className="absolute top-0 -right-4 text-3xl animate-bounce delay-100">🎉</span>
            <span className="absolute -bottom-2 -left-4 text-2xl animate-bounce delay-300">✨</span>
            <span className="absolute top-1/2 -right-12 text-2xl animate-pulse">🚀</span>
          </div>

          <CardTitle className="text-4xl font-black tracking-tight text-white mb-2">
            Pagamento Confirmado!
          </CardTitle>
          <div className="flex items-center justify-center gap-2 text-green-400 font-bold text-xl animate-pulse">
            <Tv className="w-6 h-6" />
            <span>Sistema Renovado com Sucesso! ✅</span>
          </div>
        </CardHeader>

        <CardContent className="text-center space-y-6 px-10">
          <div className="p-6 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-sm">
            <p className="text-slate-300 text-lg leading-relaxed">
              Olá {userParam ? <span className="text-blue-400 font-bold">{userParam}</span> : 'cliente'}, sua assinatura foi processada e os créditos já estão disponíveis na sua conta! 🎈
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-slate-400 text-sm">
              Agora você já pode aproveitar todos os canais, filmes e séries sem interrupções. 🍿📺
            </p>
            <div className="flex justify-center gap-4 py-2">
              <span className="px-3 py-1 bg-blue-500/10 text-blue-400 text-xs font-bold rounded-full border border-blue-500/20">Canais 4K</span>
              <span className="px-3 py-1 bg-purple-500/10 text-purple-400 text-xs font-bold rounded-full border border-purple-500/20">Filmes</span>
              <span className="px-3 py-1 bg-pink-500/10 text-pink-400 text-xs font-bold rounded-full border border-pink-500/20">Séries</span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4 pb-12 pt-8 px-10">
          <Button 
            className="w-full h-14 text-lg font-bold bg-white text-slate-950 hover:bg-slate-200 transition-all shadow-xl hover:shadow-white/10 group" 
            onClick={() => navigate('/checkout')}
          >
            Fazer outra renovação
            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
          
          <p className="text-slate-500 text-sm italic">
            Obrigado por confiar em nossos serviços! 😊💚
          </p>
        </CardFooter>
      </Card>
      
      {/* Decorative floating elements */}
      <div className="absolute top-20 right-[15%] w-2 h-2 bg-green-500 rounded-full animate-float opacity-50" />
      <div className="absolute bottom-40 left-[10%] w-3 h-3 bg-blue-500 rounded-full animate-float [animation-delay:2s] opacity-50" />
      <div className="absolute top-1/2 left-10 w-2 h-2 bg-purple-500 rounded-full animate-float [animation-delay:4s] opacity-50" />
    </div>
  );
}
