import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { openaiService } from "./services/openaiService";
import { documentProcessor } from "./services/documentProcessor";
import { kpiNormalizer } from "./services/kpiNormalizer";
import { insertCompanySchema, insertDocumentSchema, insertFinancialMetricsSchema } from "@shared/schema";
import { z } from "zod";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Upload and analyze documents
  app.post('/api/companies/:companyId/documents', upload.single('document'), async (req, res) => {
    try {
      const { companyId } = req.params;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Validate file type
      if (!documentProcessor.validateFileType(file.originalname, file.mimetype)) {
        return res.status(400).json({ error: 'Invalid file type. Only PDF and HTML files are supported.' });
      }

      // Create document record
      const fileType = documentProcessor.getFileType(file.originalname, file.mimetype);
      const document = await storage.createDocument({
        companyId,
        filename: file.originalname,
        fileType
      });

      // Extract text from document
      const extractedText = await documentProcessor.extractTextFromBuffer(file.buffer, fileType);
      
      // Update document with extracted text
      await storage.updateDocumentProcessed(document.id, extractedText);

      res.json({ document: { ...document, extractedText } });
    } catch (error) {
      console.error('Document upload error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to process document' });
    }
  });

  // Create or get company
  app.post('/api/companies', async (req, res) => {
    try {
      const validatedData = insertCompanySchema.parse(req.body);
      const normalizedName = kpiNormalizer.normalizeCompanyName(validatedData.name);
      
      // Check if company already exists
      const existingCompany = await storage.getCompanyByName(validatedData.name);
      if (existingCompany) {
        return res.json({ company: existingCompany });
      }

      const company = await storage.createCompany({
        ...validatedData,
        normalizedName
      });

      res.json({ company });
    } catch (error) {
      console.error('Company creation error:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid company data' });
    }
  });

  // Analyze documents for compatibility
  app.post('/api/analyze/compatibility', async (req, res) => {
    try {
      const { documentIds } = req.body;

      if (!Array.isArray(documentIds) || documentIds.length < 2) {
        return res.status(400).json({ error: 'At least 2 documents required for compatibility analysis' });
      }

      const documents = [];
      for (const docId of documentIds) {
        const doc = await storage.getDocument(docId);
        if (!doc || !doc.extractedText) {
          return res.status(400).json({ error: `Document ${docId} not found or not processed` });
        }
        const company = await storage.getCompany(doc.companyId);
        documents.push({
          text: doc.extractedText,
          companyName: company?.name || 'Unknown'
        });
      }

      const compatibility = await openaiService.validateDocumentCompatibility(documents);
      
      const allCompatible = compatibility.every(comp => comp.compatible);
      const issues = compatibility.flatMap(comp => comp.issues);

      res.json({
        compatible: allCompatible,
        documents: compatibility,
        issues: issues.length > 0 ? issues : null
      });
    } catch (error) {
      console.error('Compatibility analysis error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to analyze compatibility' });
    }
  });

  // Extract financial metrics from documents
  app.post('/api/analyze/metrics', async (req, res) => {
    try {
      const { documentIds } = req.body;

      if (!Array.isArray(documentIds) || documentIds.length === 0) {
        return res.status(400).json({ error: 'Document IDs required for metrics extraction' });
      }

      const extractedMetrics = [];

      for (const docId of documentIds) {
        const doc = await storage.getDocument(docId);
        if (!doc || !doc.extractedText) {
          continue;
        }

        const company = await storage.getCompany(doc.companyId);
        const companyName = company?.name || 'Unknown';

        const metrics = await openaiService.extractFinancialMetrics(doc.extractedText, companyName);
        
        // Normalize the extracted data
        const normalizedMetrics = {
          companyId: doc.companyId,
          documentId: doc.id,
          period: metrics.period,
          year: metrics.year,
          quarter: metrics.quarter,
          revenue: kpiNormalizer.normalizeMetricValue(metrics.revenue),
          netIncome: kpiNormalizer.normalizeMetricValue(metrics.netIncome),
          totalAssets: kpiNormalizer.normalizeMetricValue(metrics.totalAssets),
          cashEquivalents: kpiNormalizer.normalizeMetricValue(metrics.cashEquivalents),
          profitMargin: kpiNormalizer.normalizeMetricValue(metrics.profitMargin),
          yoyGrowth: kpiNormalizer.normalizeMetricValue(metrics.yoyGrowth),
          ebitda: kpiNormalizer.normalizeMetricValue(metrics.ebitda),
          debt: kpiNormalizer.normalizeMetricValue(metrics.debt),
          rawMetrics: (metrics.rawMetrics as Record<string, any>) || {}
        };

        const savedMetrics = await storage.createFinancialMetrics(normalizedMetrics);
        extractedMetrics.push({
          ...savedMetrics,
          companyName: metrics.companyName
        });
      }

      res.json({ metrics: extractedMetrics });
    } catch (error) {
      console.error('Metrics extraction error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to extract metrics' });
    }
  });

  // Generate comparison insights
  app.post('/api/analyze/insights', async (req, res) => {
    try {
      const { companyIds } = req.body;

      if (!Array.isArray(companyIds) || companyIds.length < 2) {
        return res.status(400).json({ error: 'At least 2 companies required for comparison insights' });
      }

      const allMetrics = [];

      for (const companyId of companyIds) {
        const company = await storage.getCompany(companyId);
        const metrics = await storage.getMetricsByCompany(companyId);
        
        if (company && metrics.length > 0) {
          // Get the most recent metrics for each company
          const latestMetrics = metrics[metrics.length - 1];
          allMetrics.push({
            companyName: company.name,
            ...latestMetrics
          });
        }
      }

      if (allMetrics.length < 2) {
        return res.status(400).json({ error: 'Insufficient metrics data for comparison' });
      }

      const insights = await openaiService.generateComparisonInsights(allMetrics.map(m => ({
        companyName: m.companyName,
        period: m.period,
        year: m.year,
        quarter: m.quarter,
        revenue: m.revenue,
        netIncome: m.netIncome,
        totalAssets: m.totalAssets,
        cashEquivalents: m.cashEquivalents,
        profitMargin: m.profitMargin,
        yoyGrowth: m.yoyGrowth,
        ebitda: m.ebitda,
        debt: m.debt,
        rawMetrics: (m.rawMetrics as Record<string, any>) || {}
      })));

      // Save comparison
      const comparison = await storage.createComparison({
        companyIds: companyIds,
        insights: insights
      });

      res.json({ 
        comparison: comparison,
        insights: insights,
        metrics: allMetrics
      });
    } catch (error) {
      console.error('Insights generation error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to generate insights' });
    }
  });

  // Get company with metrics
  app.get('/api/companies/:companyId', async (req, res) => {
    try {
      const { companyId } = req.params;
      
      const company = await storage.getCompany(companyId);
      if (!company) {
        return res.status(404).json({ error: 'Company not found' });
      }

      const documents = await storage.getDocumentsByCompany(companyId);
      const metrics = await storage.getMetricsByCompany(companyId);

      res.json({ 
        company,
        documents,
        metrics
      });
    } catch (error) {
      console.error('Get company error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get company data' });
    }
  });

  // Export comparison to CSV
  app.get('/api/comparisons/:comparisonId/export', async (req, res) => {
    try {
      const { comparisonId } = req.params;
      
      const comparison = await storage.getComparison(comparisonId);
      if (!comparison) {
        return res.status(404).json({ error: 'Comparison not found' });
      }

      const companyIds = comparison.companyIds as string[];
      const csvRows = ['Company,Period,Revenue (B),Net Income (B),Total Assets (B),Cash Equivalents (B),Profit Margin (%),YoY Growth (%)'];

      for (const companyId of companyIds) {
        const company = await storage.getCompany(companyId);
        const metrics = await storage.getMetricsByCompany(companyId);
        
        if (company && metrics.length > 0) {
          const latest = metrics[metrics.length - 1];
          csvRows.push([
            company.name,
            latest.period,
            latest.revenue || 'N/A',
            latest.netIncome || 'N/A',
            latest.totalAssets || 'N/A',
            latest.cashEquivalents || 'N/A',
            latest.profitMargin || 'N/A',
            latest.yoyGrowth || 'N/A'
          ].join(','));
        }
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="financial-comparison-${comparisonId}.csv"`);
      res.send(csvRows.join('\n'));
    } catch (error) {
      console.error('Export error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to export comparison' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
