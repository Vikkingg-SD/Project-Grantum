/** Frontend integration contracts. Legacy grant-keyed APIs are not migrated yet. */
export type ProjectKind = 'grant' | 'startup' | 'social' | 'invention' | 'other';
export type OutputKind = 'application' | 'pitch-deck' | 'document';

export interface EvidenceReference {
  id: string;
  url: string;
  title: string;
  retrievedAt: string;
  excerpt?: string;
}

export interface ProfileRevision {
  readonly id: string;
  readonly projectId: string;
  readonly parentRevisionId: string | null;
  readonly authorId: string;
  readonly createdAt: string;
  readonly summary: string;
  readonly fields: Readonly<Record<string, string>>;
}

export interface ProjectProfile {
  id: string;
  name: string;
  kind: ProjectKind;
  currentRevisionId: string;
  archivedAt: string | null;
}

/** Completion and matching are independent assessments, never checklist counts. */
export type WorkspaceAssessment =
  | { status: 'unavailable' | 'pending'; reason: string }
  | {
      status: 'ready';
      purpose: 'profile-completion' | 'grant-match';
      score: number;
      profileRevisionId: string;
      applicationRevisionId?: string;
      generatedAt: string;
      reasons: string[];
      unknowns: string[];
      sources: EvidenceReference[];
    }
  | { status: 'error'; message: string };

export interface TemplateRequirement {
  id: string;
  title: string;
  origin: 'template' | 'user' | 'ai-suggestion';
  sourceIds: string[];
  accepted: boolean;
}

export interface WorkTemplate {
  id: string;
  version: string;
  projectKind: ProjectKind;
  outputs: OutputKind[];
  requirements: TemplateRequirement[];
  trackSummary?: { text: string; sources: EvidenceReference[] };
}

export interface ApplicationArtifact {
  id: string;
  kind: OutputKind;
  title: string;
  revisionId: string;
}

/** An application ID, not a grant ID, is the future draft/cache/route key. */
export interface ApplicationBundle {
  id: string;
  projectId: string;
  grantId: string;
  fundingRoundId: string | null;
  profileRevisionId: string;
  template: { id: string; version: string };
  status: 'drafting' | 'review' | 'ready' | 'submitted' | 'archived';
  artifacts: ApplicationArtifact[];
  updatedAt: string;
  submittedSnapshot: {
    readonly profileRevisionId: string;
    readonly artifactRevisionIds: readonly string[];
    readonly submittedAt: string;
    readonly receiptReference: string | null;
  } | null;
}
