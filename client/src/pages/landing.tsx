import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChartLine, FileText, Brain, BarChart3, Rocket, Upload, Zap, Download, Mail, User, LogIn, UserPlus, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { User as UserType } from "@shared/schema";

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading, user } = useAuth();
  const { toast } = useToast();

  const handleStartComparison = () => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to start comparing companies.",
        variant: "default",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 1000);
      return;
    }
    setLocation("/compare");
  };

  const handleSignIn = () => {
    window.location.href = "/api/login";
  };

  const handleSignOut = () => {
    window.location.href = "/api/logout";
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
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
              <button 
                onClick={() => scrollToSection('features')} 
                className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                data-testid="nav-features"
              >
                Features
              </button>
              <button 
                onClick={() => scrollToSection('how-it-works')} 
                className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                data-testid="nav-how-it-works"
              >
                How it Works
              </button>
              <button 
                onClick={() => scrollToSection('contact')} 
                className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                data-testid="nav-contact"
              >
                Contact
              </button>
              
              {!isLoading && (
                <div className="flex items-center space-x-4">
                  {isAuthenticated ? (
                    <div className="flex items-center space-x-4">
                      {user?.firstName && (
                        <span className="text-sm text-muted-foreground">
                          Hi, {user.firstName}
                        </span>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleSignOut}
                        data-testid="button-sign-out"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleSignIn}
                        data-testid="button-sign-in"
                      >
                        <LogIn className="mr-2 h-4 w-4" />
                        Sign In
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={handleSignIn}
                        data-testid="button-sign-up"
                      >
                        <UserPlus className="mr-2 h-4 w-4" />
                        Sign Up
                      </Button>
                    </>
                  )}
                </div>
              )}
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
                disabled={isLoading}
              >
                <Rocket className="mr-2 h-5 w-5" />
                {isAuthenticated ? "Start Comparing" : "Sign In to Compare"}
              </Button>
            </CardContent>
          </Card>

          {/* Feature Cards */}
          <div id="features" className="grid md:grid-cols-3 gap-8 mt-16 scroll-mt-20">
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

      {/* How it Works Section */}
      <section id="how-it-works" className="bg-white py-20 scroll-mt-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold text-foreground mb-12">How it Works</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <Card className="shadow-sm" data-testid="card-step-upload">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                    <Upload className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">1. Upload Documents</h3>
                  <p className="text-muted-foreground text-sm">
                    Upload financial documents (PDFs, HTML, CSV) from 2-4 companies you want to compare.
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-sm" data-testid="card-step-analyze">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                    <Zap className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">2. AI Analysis</h3>
                  <p className="text-muted-foreground text-sm">
                    Our AI extracts key financial metrics, normalizes data formats, and enriches with market data.
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-sm" data-testid="card-step-insights">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                    <Download className="h-6 w-6 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">3. Get Insights</h3>
                  <p className="text-muted-foreground text-sm">
                    View side-by-side comparisons, visual charts, and export detailed reports for decision making.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="bg-gradient-to-br from-gray-50 to-gray-100 py-20 scroll-mt-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-4xl font-bold text-foreground mb-12">Get in Touch</h2>
            
            <Card className="shadow-lg" data-testid="card-contact">
              <CardContent className="p-8">
                <div className="space-y-6">
                  <div className="flex items-center justify-center space-x-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-xl font-semibold text-foreground" data-testid="text-contact-name">
                        Utkarsh Bagal
                      </h3>
                      <p className="text-muted-foreground">Developer & Financial Analyst</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-center space-x-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Mail className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm text-muted-foreground">Email</p>
                      <a 
                        href="mailto:utkarshs@hexaware.com" 
                        className="text-lg font-medium text-primary hover:underline"
                        data-testid="link-contact-email"
                      >
                        utkarshs@hexaware.com
                      </a>
                    </div>
                  </div>
                  
                  <p className="text-muted-foreground text-center mt-6">
                    Have questions about FinCompare or need help with financial document analysis? 
                    Feel free to reach out!
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
