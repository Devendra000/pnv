'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDataContext } from '@/contexts/AppDataContext';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function GenerateDocumentPage() {
  const router = useRouter();
  const { companies, templates, variables, addDocument } = useAppDataContext();

  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');

  const handleGenerate = () => {
    if (!selectedCompany || !selectedTemplate) {
      alert('Please select both a company and template');
      return;
    }

    const company = companies.find((c) => c.id === selectedCompany);
    const template = templates.find((t) => t.id === selectedTemplate);

    if (!company || !template) {
      alert('Invalid selection');
      return;
    }

    // Replace variables in template
    let content = template.content;

    // Create variable map
    const varMap: Record<string, string> = {
      CompanyName: company.name,
      RegistrationNumber: company.registrationNumber,
      Country: company.country,
      Industry: company.industry,
      OwnerNames: company.owners.map((o) => o.name).join(', '),
      WitnessNames: company.witnesses.map((w) => w.name).join(', '),
      DateGenerated: new Date().toISOString().split('T')[0],
      CompanyObjectives: company.objectives
        .map((o) => `• ${o.text}`)
        .join('\n'),
    };

    // Replace all variables
    Object.entries(varMap).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      content = content.replace(regex, value);
    });

    setGeneratedContent(content);
  };

  const handleSave = () => {
    if (!selectedCompany || !selectedTemplate || !generatedContent) {
      alert('Please generate a document first');
      return;
    }

    const company = companies.find((c) => c.id === selectedCompany);
    const template = templates.find((t) => t.id === selectedTemplate);

    if (!company || !template) {
      alert('Invalid selection');
      return;
    }

    addDocument({
      id: `doc-${Date.now()}`,
      companyId: company.id,
      companyName: company.name,
      templateId: template.id,
      templateName: template.name,
      generatedDate: new Date().toISOString().split('T')[0],
      content: generatedContent,
    });

    alert('Document saved successfully!');
    router.push('/documents');
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-background">
      <PageHeader
        title="Generate Document"
        description="Create a new official document from a template by selecting a company and template"
      />

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Inputs */}
          <div className="lg:col-span-1">
            <div className="bg-card border border-border rounded-xl p-6 sticky top-20">
              <h2 className="text-lg font-semibold text-foreground mb-6">
                Document Inputs
              </h2>

              <div className="space-y-5">
                {/* Company Selection */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2.5">
                    Select Company <span className="text-primary">*</span>
                  </label>
                  <select
                    value={selectedCompany}
                    onChange={(e) => setSelectedCompany(e.target.value)}
                    className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                  >
                    <option value="">Choose a company...</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name} ({company.registrationNumber})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Template Selection */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2.5">
                    Select Template <span className="text-primary">*</span>
                  </label>
                  <select
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                  >
                    <option value="">Choose a template...</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Generate Button */}
                <Button
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2.5 rounded-lg transition-colors"
                  onClick={handleGenerate}
                >
                  Generate Document
                </Button>

                {/* Company Details */}
                {selectedCompany && companies.find((c) => c.id === selectedCompany) && (
                  <div className="mt-6 pt-6 border-t border-border">
                    <h3 className="font-semibold text-foreground mb-4">
                      Company Details
                    </h3>
                    {(() => {
                      const company = companies.find((c) => c.id === selectedCompany);
                      return (
                        <div className="space-y-3 text-sm">
                          <div>
                            <p className="text-muted-foreground mb-1">Name</p>
                            <p className="text-foreground font-medium">
                              {company?.name}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground mb-1">Registration</p>
                            <p className="text-foreground font-medium">
                              {company?.registrationNumber}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground mb-1">Country</p>
                            <p className="text-foreground font-medium">
                              {company?.country}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground mb-1">Owners</p>
                            <p className="text-foreground font-medium">
                              {company?.owners.map((o) => o.name).join(', ')}
                            </p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel - Preview and Actions */}
          <div className="lg:col-span-2">
            <div className="bg-card border border-border rounded-xl p-6 flex flex-col h-full">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Document Preview
              </h2>
              
              <div className="flex-1 bg-input/50 border border-border rounded-lg p-5 overflow-y-auto mb-6">
                {generatedContent ? (
                  <pre className="text-sm text-foreground whitespace-pre-wrap break-words font-mono leading-relaxed">
                    {generatedContent}
                  </pre>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground text-center">
                      Select a company and template, then click<br />
                      <span className="font-semibold">"Generate Document"</span> to preview
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {generatedContent && (
                <div className="flex gap-3">
                  <Button
                    className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2.5 rounded-lg transition-colors"
                    onClick={handleSave}
                  >
                    Save Document
                  </Button>
                  <Button
                    variant="outline"
                    className="px-6 border-border text-foreground hover:bg-muted"
                    onClick={() => {
                      setSelectedCompany('');
                      setSelectedTemplate('');
                      setGeneratedContent('');
                    }}
                  >
                    Clear
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
