param storageAccountName string
param appInsightsName string
param managedIdentityPrincipalId string
@description('Deploying user, granted the same data-plane roles for local testing and debugging. Leave empty to skip.')
param userIdentityPrincipalId string = ''

// Flex Consumption needs blob (deployment package, AzureWebJobsStorage) and queue (MCP trigger) access.
var blobRoleDefinitionId = 'b7e6dc6d-f1e8-4753-8033-0f276bb0955b' // Storage Blob Data Owner
var queueRoleDefinitionId = '974c5e8b-45b9-4653-ba55-5f855dd0fb88' // Storage Queue Data Contributor
var monitoringRoleDefinitionId = '3913510d-42f4-4e42-8a64-420c390055eb' // Monitoring Metrics Publisher

var principals = concat(
  [{ id: managedIdentityPrincipalId, type: 'ServicePrincipal' }],
  !empty(userIdentityPrincipalId) ? [{ id: userIdentityPrincipalId, type: 'User' }] : []
)

resource storageAccount 'Microsoft.Storage/storageAccounts@2022-09-01' existing = {
  name: storageAccountName
}

resource applicationInsights 'Microsoft.Insights/components@2020-02-02' existing = {
  name: appInsightsName
}

resource blobRoleAssignments 'Microsoft.Authorization/roleAssignments@2022-04-01' = [for p in principals: {
  name: guid(storageAccount.id, p.id, blobRoleDefinitionId)
  scope: storageAccount
  properties: {
    roleDefinitionId: resourceId('Microsoft.Authorization/roleDefinitions', blobRoleDefinitionId)
    principalId: p.id
    principalType: p.type
  }
}]

resource queueRoleAssignments 'Microsoft.Authorization/roleAssignments@2022-04-01' = [for p in principals: {
  name: guid(storageAccount.id, p.id, queueRoleDefinitionId)
  scope: storageAccount
  properties: {
    roleDefinitionId: resourceId('Microsoft.Authorization/roleDefinitions', queueRoleDefinitionId)
    principalId: p.id
    principalType: p.type
  }
}]

resource appInsightsRoleAssignments 'Microsoft.Authorization/roleAssignments@2022-04-01' = [for p in principals: {
  name: guid(applicationInsights.id, p.id, monitoringRoleDefinitionId)
  scope: applicationInsights
  properties: {
    roleDefinitionId: resourceId('Microsoft.Authorization/roleDefinitions', monitoringRoleDefinitionId)
    principalId: p.id
    principalType: p.type
  }
}]
