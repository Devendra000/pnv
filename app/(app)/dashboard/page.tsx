'use client';

import { useAppDataContext } from '@/contexts/AppDataContext';
import { PageHeader } from '@/components/PageHeader';
import { Building2, Target, Variable, FileText, FileStack, BarChart3 } from 'lucide-react';

export default function DashboardPage() {
  const { stats } = useAppDataContext();

  const statCards = [
    {
      title: 'Total Companies',
      value: stats.totalCompanies,
      icon: Building2,
      color: 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300',
    },
    {
      title: 'Objectives',
      value: stats.totalObjectives,
      icon: Target,
      color: 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300',
    },
    {
      title: 'Variables',
      value: stats.totalVariables,
      icon: Variable,
      color: 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300',
    },
    {
      title: 'Templates',
      value: stats.totalTemplates,
      icon: FileText,
      color: 'bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-300',
    },
    {
      title: 'Documents Generated',
      value: stats.totalDocumentsGenerated,
      icon: FileStack,
      color: 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300',
    },
  ];

  return (
    <div className="h-full flex flex-col" suppressHydrationWarning>
      <PageHeader
        title="Dashboard"
        description="Welcome to the Company Document Generator Admin"
      />

      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6 space-y-8">
          {/* Statistics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.title}
                  className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {card.title}
                      </p>
                      <p className="text-4xl font-bold text-foreground mt-3">
                        {card.value}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-primary/10">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Start Section */}
          <div className="bg-card border border-border rounded-xl p-8">
            <h2 className="text-2xl font-bold text-foreground mb-6">Quick Start Guide</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/20 text-primary">
                    <span className="text-sm font-bold">1</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Manage Companies</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create and organize company profiles with owners, witnesses, and objectives
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-accent/20 text-accent">
                    <span className="text-sm font-bold">2</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Configure Templates</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Set up document templates with dynamic variables for automatic content generation
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/20 text-primary">
                    <span className="text-sm font-bold">3</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Generate Documents</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Instantly generate professional documents with company data substitution
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
