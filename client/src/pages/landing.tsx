import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChartLine, FileText, Brain, BarChart3, Rocket } from "lucide-react";

export default function LandingPage() {
  const [, setLocation] = useLocation();

  const handleStartComparison = () => {
    setLocation("/compare");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation Header */}
      <header className="bg-background/90 backdrop-blur-sm border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <ChartLine className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold text-primary">FinCompare</span>
            </div>
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">
                How it Works
              </a>
              <a href="#contact" className="text-muted-foreground hover:text-foreground transition-colors">
                Contact
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
            Instant Financial<br />
            <span className="text-primary">Document Analysis</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            Transform complex financial documents into clear, actionable comparisons. Upload company filings, get AI-powered insights, and make informed decisions faster than ever.
          </p>
          
          <Card className="border border-border shadow-lg mb-12" data-testid="cta-card">
            <CardContent className="p-8">
              <p className="text-lg text-muted-foreground mb-6">
                Want to get insights and financial comparison of companies using cutting edge technology?
              </p>
              <Button 
                onClick={handleStartComparison}
                size="lg"
                className="font-semibold text-lg px-8 py-4 transform hover:scale-105 transition-all duration-200"
                data-testid="button-start-comparing"
              >
                <Rocket className="mr-2 h-5 w-5" />
                Start Comparing
              </Button>
            </CardContent>
          </Card>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-8 mt-16">
            <Card className="shadow-sm" data-testid="card-feature-formats">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 mx-auto">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Multi-Format Support</h3>
                <p className="text-muted-foreground text-sm">
                  Upload PDFs, HTML files, or CSV data from financial reports and filings.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm" data-testid="card-feature-ai">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4 mx-auto">
                  <Brain className="h-6 w-6 text-accent" />
                </div>
                <h3 className="text-lg font-semibold mb-2">AI-Powered Analysis</h3>
                <p className="text-muted-foreground text-sm">
                  Advanced AI extracts and normalizes financial metrics across different reporting formats.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm" data-testid="card-feature-insights">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                  <BarChart3 className="h-6 w-6 text-orange-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Visual Insights</h3>
                <p className="text-muted-foreground text-sm">
                  Generate comparison tables, charts, and export reports in multiple formats.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
