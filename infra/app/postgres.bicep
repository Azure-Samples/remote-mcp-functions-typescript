@description('Name of the PostgreSQL flexible server')
param name string
param location string = resourceGroup().location
param tags object = {}

@description('Name of the database that holds the workitems and qa_log tables')
param databaseName string = 'workitems'

@description('Entra ID administrators. Each becomes a PostgreSQL role that can log in with an Entra token.')
param administrators array = []

@description('Allow connections from Azure services (the Function App has no fixed outbound IP on Flex Consumption)')
param allowAzureServices bool = true

// Burstable single-zone server with Entra-only authentication (no password).
module server 'br/public:avm/res/db-for-postgre-sql/flexible-server:0.9.1' = {
  name: 'postgres-flexible-server'
  params: {
    name: name
    location: location
    tags: tags
    skuName: 'Standard_B1ms'
    tier: 'Burstable'
    version: '16'
    storageSizeGB: 32
    highAvailability: 'Disabled'
    geoRedundantBackup: 'Disabled'
    availabilityZone: '1'
    publicNetworkAccess: 'Enabled'
    tenantId: tenant().tenantId
    administrators: administrators
    databases: [
      {
        name: databaseName
      }
    ]
    firewallRules: allowAzureServices ? [
      {
        name: 'AllowAllAzureServicesAndResourcesWithinAzureIps'
        startIpAddress: '0.0.0.0'
        endIpAddress: '0.0.0.0'
      }
    ] : []
  }
}

output name string = server.outputs.name
output fqdn string = server.outputs.fqdn
output databaseName string = databaseName
