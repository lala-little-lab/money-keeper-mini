/* Step2 DRAFT: versioned envelope; future migrations belong here. */
const MKMigrations={
  currentVersion:1,
  upgrade(envelope){
    if(!envelope||typeof envelope!=='object'||!Number.isInteger(envelope.schemaVersion))throw new Error('Unversioned database');
    if(envelope.schemaVersion!==this.currentVersion)throw new Error('Unsupported data version: '+envelope.schemaVersion);
    if(!envelope.data||typeof envelope.data!=='object')throw new Error('Invalid database payload');
    return envelope;
  }
};
