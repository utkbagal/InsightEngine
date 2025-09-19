import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ChartLine, Upload, BarChart3, Download, Plus } from "lucide-react";
import FileUpload from "@/components/FileUpload";
import LoadingAnalysis from "@/components/LoadingAnalysis";
import ComparisonResults from "@/components/ComparisonResults";
import { api, type Company, type Document } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface CompanyData {
  company?: Company;
  document?: Document;
  name: string;
  file?: File;
  isRequired: boolean;
}

type Step = 'upload' | 'analysis' | 'results';

export default function ComparisonPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<Step>('upload');
  const [companies, setCompanies] = useState<CompanyData[]>([
    { name: '', isRequired: true },
    { name: '', isRequired: true },
    { name: '', isRequired: false },
    { name: '', isRequired: false },
  ]);
  const [comparisonResult, setComparisonResult] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleBack = () => {
    if (currentStep === 'upload') {
      setLocation('/');
    } else {
      setCurrentStep('upload');
      setComparisonResult(null);
    }
  };

  const getStepNumber = () => {
    switch (currentStep) {
      case 'upload': return 1;
      case 'analysis': return 2;
      case 'results': return 3;
      default: return 1;
    }
  };

  const getProgressPercentage = () => {
    return (getStepNumber() / 3) * 100;
  };

  const handleCompanyNameChange = (index: number, name: string) => {
    const updated = [...companies];
    updated[index].name = name;
    setCompanies(updated);
  };

  const handleFileSelect = (index: number, file: File) => {
    const updated = [...companies];
    updated[index].file = file;
    setCompanies(updated);
  };

  const handleRemoveFile = (index: number) => {
    const updated = [...companies];
    updated[index].file = undefined;
    setCompanies(updated);
  };

  const validateForm = () => {
    const activeCompanies = companies.filter(c => c.isRequired || c.name.trim() || c.file);
    
    if (activeCompanies.length < 2) {
      toast({
        title: "Validation Error",
        description: "At least 2 companies are required for comparison.",
        variant: "destructive"
      });
      return false;
    }

    for (const company of activeCompanies) {
      if (!company.name.trim()) {
        toast({
          title: "Validation Error", 
          description: "Company name is required for all uploaded documents.",
          variant: "destructive"
        });
        return false;
      }
      if (!company.file) {
        toast({
          title: "Validation Error",
          description: "Document is required for all companies.",
          variant: "destructive"
        });
        return false;
      }
    }

    return true;
  };

  const handleStartAnalysis = async () => {
    if (!validateForm()) return;

    setIsProcessing(true);
    setCurrentStep('analysis');

    try {
      // Filter active companies
      const activeCompanies = companies.filter(c => c.name.trim() && c.file);
      const documentIds: string[] = [];
      const companyIds: string[] = [];

      // Create companies and upload documents
      for (const companyData of activeCompanies) {
        const { company } = await api.createCompany(companyData.name.trim());
        const { document } = await api.uploadDocument(company.id, companyData.file!);
        
        documentIds.push(document.id);
        companyIds.push(company.id);

        // Update state with created company and document
        const index = companies.indexOf(companyData);
        const updated = [...companies];
        updated[index].company = company;
        updated[index].document = document;
        setCompanies(updated);
      }

      // Check document compatibility
      const compatibility = await api.analyzeCompatibility(documentIds);
      
      if (!compatibility.compatible) {
        toast({
          title: "Document Compatibility Issue",
          description: compatibility.issues?.join('. ') || "Documents are not compatible for comparison.",
          variant: "destructive"
        });
        setCurrentStep('upload');
        setIsProcessing(false);
        return;
      }

      // Extract metrics
      await api.extractMetrics(documentIds);

      // Generate insights
      const result = await api.generateInsights(companyIds);
      setComparisonResult(result);
      setCurrentStep('results');
      
      toast({
        title: "Analysis Complete",
        description: "Financial comparison has been generated successfully.",
      });

    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis Error",
        description: error instanceof Error ? error.message : "Failed to analyze documents. Please try again.",
        variant: "destructive"
      });
      setCurrentStep('upload');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNewComparison = () => {
    setCompanies([
      { name: '', isRequired: true },
      { name: '', isRequired: true },
      { name: '', isRequired: false },
      { name: '', isRequired: false },
    ]);
    setComparisonResult(null);
    setCurrentStep('upload');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={handleBack}
                data-testid="button-back"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <div className="flex items-center space-x-2">
                <ChartLine className="h-6 w-6 text-primary" />
                <span className="text-xl font-bold text-primary">FinCompare</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">
                Step <span data-testid="text-current-step">{getStepNumber()}</span> of 3
              </span>
              <div className="w-32">
                <Progress value={getProgressPercentage()} />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Upload Section */}
        {currentStep === 'upload' && (
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-foreground mb-4">Upload Financial Documents</h2>
              <p className="text-muted-foreground">
                Upload 2-4 company financial documents (10-K, 10-Q, annual reports) in PDF or HTML format
              </p>
            </div>

            {/* Company Upload Cards */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {companies.map((company, index) => (
                <Card key={index} className={`shadow-sm ${!company.isRequired ? 'opacity-75' : ''}`} data-testid={`card-company-${index + 1}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-lg">
                      Company {index + 1}
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        company.isRequired 
                          ? 'bg-primary/10 text-primary' 
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {company.isRequired ? 'Required' : 'Optional'}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Company Name
                      </label>
                      <input
                        type="text"
                        placeholder={`e.g., ${index === 0 ? 'Apple Inc.' : index === 1 ? 'Microsoft Corp.' : index === 2 ? 'Google (Alphabet)' : 'Meta Platforms'}`}
                        className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                        value={company.name}
                        onChange={(e) => handleCompanyNameChange(index, e.target.value)}
                        data-testid={`input-company-name-${index + 1}`}
                      />
                    </div>
                    
                    <FileUpload
                      onFileSelect={(file) => handleFileSelect(index, file)}
                      onRemoveFile={() => handleRemoveFile(index)}
                      selectedFile={company.file}
                      disabled={!company.isRequired && !company.name.trim()}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center space-x-4">
              <Button variant="outline" onClick={() => setLocation('/')} data-testid="button-cancel">
                Cancel
              </Button>
              <Button 
                onClick={handleStartAnalysis}
                disabled={isProcessing}
                data-testid="button-start-analysis"
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                Start Analysis
              </Button>
            </div>
          </div>
        )}

        {/* Analysis Section */}
        {currentStep === 'analysis' && (
          <LoadingAnalysis />
        )}

        {/* Results Section */}
        {currentStep === 'results' && comparisonResult && (
          <ComparisonResults 
            result={comparisonResult}
            onNewComparison={handleNewComparison}
          />
        )}
      </div>
    </div>
  );
}
