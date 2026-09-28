import type { ProjectId } from '@likec4/core'
import { type AstNodeDescription, type LangiumDocument, type Stream, DefaultIndexManager, stream } from 'langium'
import type { CancellationToken } from 'vscode-languageserver'
import type { URI } from 'vscode-uri'
import type { LikeC4SharedServices } from '../module'

export class IndexManager extends DefaultIndexManager {
  constructor(protected services: LikeC4SharedServices) {
    super(services)
  }

  private readonly projectValidationDependencies = new Map<string, ProjectId>()

  /** Cross-document checks can depend on model data without a Langium symbol reference. */
  registerProjectValidationDependency(document: LangiumDocument): void {
    this.projectValidationDependencies.set(
      document.uri.toString(),
      this.services.workspace.ProjectsManager.ownerProjectId(document),
    )
  }

  override isAffected(document: LangiumDocument, changedUris: Set<string>): boolean {
    const projectId = this.projectValidationDependencies.get(document.uri.toString())
    if (
      projectId &&
      [...changedUris].some(uri => this.services.workspace.ProjectsManager.ownerProjectId(uri) === projectId)
    ) {
      return true
    }
    return super.isAffected(document, changedUris)
  }

  override remove(uri: URI): void {
    this.projectValidationDependencies.delete(uri.toString())
    super.remove(uri)
  }

  override async updateContent(document: LangiumDocument, cancelToken?: CancellationToken): Promise<void> {
    const projects = this.services.workspace.ProjectsManager
    // Ensure the document is assigned to a project
    document.likec4ProjectId = projects.ownerProjectId(document)
    await super.updateContent(document, cancelToken)
  }

  projectElements(projectId: ProjectId, nodeType?: string, uris?: Set<string>): Stream<AstNodeDescription> {
    const projects = this.services.workspace.ProjectsManager
    let documentUris = stream(this.symbolIndex.keys())
    return documentUris
      .filter(uri => {
        if (uris && !uris.has(uri)) {
          return false
        }
        return projects.isIncluded(projectId, uri)
      })
      .flatMap(uri => this.getFileDescriptions(uri, nodeType))
  }
}
