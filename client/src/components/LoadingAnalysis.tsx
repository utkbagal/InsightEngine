import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Brain, Check, Clock } from "lucide-react";

interface AnalysisStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'active' | 'completed';
}

export default function LoadingAnalysis() {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  const steps: AnalysisStep[] = [
    {
      id: 'validation',
      title: 'Document Validation',
      description: 'Validating document formats and compatibility',
      status: 'completed'
    },
    {
      id: 'extraction',
      title: 'Extracting Financial Metrics',
      description: 'AI is analyzing documents and extracting key financial data',
      status: 'active'
    },
    {
      id: 'insights',
      title: 'Generating Comparison Insights',
      description: 'Creating comparative analysis and insights',
      status: 'pending'
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + 2;
        
        // Update step status based on progress
        if (newProgress >= 30 && currentStepIndex === 0) {
          setCurrentStepIndex(1);
        } else if (newProgress >= 70 && currentStepIndex === 1) {
          setCurrentStepIndex(2);
        }
        
        return Math.min(newProgress, 90); // Stop at 90% to prevent completion
      });
    }, 100);

    return () => clearInterval(interval);
  }, [currentStepIndex]);

  const getStepStatus = (index: number): 'pending' | 'active' | 'completed' => {
    if (index < currentStepIndex) return 'completed';
    if (index === currentStepIndex) return 'active';
    return 'pending';
  };

  const getStepIcon = (status: 'pending' | 'active' | 'completed') => {
    switch (status) {
      case 'completed':
        return <Check className="h-4 w-4" />;
      case 'active':
        return <div className="w-3 h-3 bg-white rounded-full animate-pulse" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="max-w-2xl mx-auto text-center">
      <div className="mb-8 animate-pulse">
        <Brain className="h-16 w-16 text-primary mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-foreground mb-4">Analyzing Documents</h2>
        <p className="text-muted-foreground mb-8">
          Our AI is processing your financial documents and extracting key metrics...
        </p>
        
        <div className="w-full bg-muted rounded-full h-3 mb-2">
          <div 
            className="bg-primary h-3 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-sm text-muted-foreground">{Math.round(progress)}% complete</p>
      </div>

      {/* Progress Steps */}
      <div className="space-y-4 mb-8">
        {steps.map((step, index) => {
          const status = getStepStatus(index);
          return (
            <Card 
              key={step.id} 
              className={`transition-all duration-300 ${
                status === 'active' ? 'border-primary bg-primary/5' : 
                status === 'completed' ? 'border-accent bg-accent/5' : 'bg-muted/50'
              }`}
              data-testid={`card-analysis-step-${step.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      status === 'completed' ? 'bg-accent text-accent-foreground' :
                      status === 'active' ? 'bg-primary text-primary-foreground' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {getStepIcon(status)}
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-foreground">{step.title}</p>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                  {status === 'active' && (
                    <div className="flex items-center space-x-2">
                      <Progress value={progress} className="w-16" />
                    </div>
                  )}
                  {status === 'completed' && (
                    <Check className="h-5 w-5 text-accent" />
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="text-sm text-muted-foreground" data-testid="text-processing-status">
        Processing... This may take a few moments.
      </div>
    </div>
  );
}
