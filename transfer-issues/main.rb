require "graphql/client"
require "graphql/client/http"

ACCESS_TOKEN = "xxxxx" # Github PAT
HTTP = GraphQL::Client::HTTP.new('https://api.github.com/graphql') do
  def headers(_context)
    { 'Authorization' => "Bearer #{ACCESS_TOKEN}" }
  end
end
Schema = GraphQL::Client.load_schema(HTTP)
Client = GraphQL::Client.new(schema: Schema, execute: HTTP)

ISSUES_QUERY = Client.parse <<~GRAPHQL
  query GetIssuesInRepository($after: String) {
    repository(name: "cdp-docs", owner: "heyinc") {
      id
      issues(first: 100, after: $after, labels: ["pomelo"], states: [OPEN]) {
        edges {
          node {
            id
          }
          cursor
        }
      } 
    }
  }
GRAPHQL

TRANSFER_TO_REPOSITORY = Client.parse <<~GRAPHQL
  query {
    repository(name: "pomelo", owner: "heyinc") {
      id
    }
  }
GRAPHQL

TRANSFER_ISSUE = Client.parse <<~GRAPHQL
  mutation TransferIssue($issueId: ID!, $repositoryId: ID!) {
    transferIssue(input: { issueId: $issueId, repositoryId: $repositoryId }) {
      issue {
        id
      }
    }
  }
GRAPHQL

ADD_ISSUE_TO_PROJECT = Client.parse <<~GRAPHQL
  mutation AddProjectV2ItemById($issueID: ID!, $projectId: ID!) {
    addProjectV2ItemById(input: { projectId: $projectId, contentId: $issueID }) {
      clientMutationId
    }
  }
GRAPHQL
# PROJECT_ID = "PVT_kwDOA8Welc4Au9aR" # heyinc project
PROJECT_ID = "PVT_kwHOAp0NbM4Awr0d" # stet project

def main
  transfer_issues
end

def transfer_issues(cursor = nil)
  repository_id, issues = fetch_issues(cursor)
  puts repository_id
  puts issues

  res = Client.query(TRANSFER_TO_REPOSITORY)
  transfer_repository_id = res.data.repository.id
  puts transfer_repository_id

  issues.each do |issue|
    cursor = issue.cursor
    res = Client.query(TRANSFER_ISSUE::TransferIssue, variables: { issueId: issue.node.id, repositoryId: transfer_repository_id })
    puts res.to_h
    transferred_issue_id = res.data.to_h.dig("transferIssue", "issue", "id")
    puts transferred_issue_id

    res = Client.query(ADD_ISSUE_TO_PROJECT::AddProjectV2ItemById, variables: { issueID: transferred_issue_id, projectId: PROJECT_ID })
    puts res.to_h
  end

  transfer_issues(cursor) if issues.empty?
end

def fetch_issues(cursor = nil)
  variables = cursor ? { after: cursor } : {}
  res = Client.query(ISSUES_QUERY::GetIssuesInRepository, variables:) # わなじゃん
  repository_id = res.data.repository.id
  issues = res.data.repository.issues.edges
  [repository_id, issues]
end

main