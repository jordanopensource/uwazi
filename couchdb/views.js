{"docs": [ {"_id":"_design/documents","language":"javascript","views":{"all":{"map":"function(doc) {\nif(doc.type === 'document')\t\n  emit(doc._id, doc);\n}"},"list":{"map":"function(doc) {\nif(doc.type === 'document')\t\n  emit(doc._id, {title: doc.title, _id:doc._id, _rev:doc._rev});\n}"},"uploads":{"map":"function(doc) {\nif(doc.type === 'document' && !doc.published)\t\n  emit(doc.user._id, {title: doc.title, _id:doc._id, _rev:doc._rev, creationDate: doc.creationDate, processed: doc.processed, uploaded: doc.uploaded || false, metadata:doc.metadata, template:doc.template});\n}"},"metadata_by_template":{"map":"function(doc) {\n  if(doc.type === 'document' && doc.template) {\n    emit(doc.template, {_id: doc._id, metadata: doc.metadata});\n  }\n}"},"conversions":{"map":"function(doc) {\n  if(doc.type === 'conversion') {\n    emit(doc.document, doc);\n  }\n}"},"count_by_template":{"map":"function(doc) {\n\tif(doc.type === 'document' && doc.template)\n\t\temit(doc.template, 1);\n}","reduce":"_sum"},"docs":{"map":"function(doc) {\nif(doc.type === 'document')\n  var newDoc = {};\t\n  for(var k in doc) {\n   if(k !== 'fullText' && k !== 'file' && k !== 'user') {\n    newDoc[k]=doc[k];\n   }\t\n  }\n \t\t\n  emit(doc._id, newDoc);\n}"}},"updates":{"partialUpdate":"function(doc, req) { if (!doc) { return [ null, JSON.stringify({ status: 'nodoc' }) ]; } _ref = JSON.parse(req.body); for (k in _ref) { v = _ref[k]; if (k[0] === '/') { nestedDoc = doc; nestedKeys = k.split('/'); _ref1 = nestedKeys.slice(1, -1); for (_i = 0, _len = _ref1.length; _i < _len; _i++) { nestedKey = _ref1[_i]; nestedDoc = ((_ref2 = nestedDoc[nestedKey]) != null ? _ref2 : nestedDoc[nestedKey] = {}); } k = nestedKeys.slice(-1)[0]; if (v === '__delete__') { delete nestedDoc[k]; } else { nestedDoc[k] = v; } continue; } if (v === '__delete__') { delete doc[k]; } else { doc[k] = v; } } return [ doc, JSON.stringify({id:doc._id}) ]; }"}},{"_id":"_design/recoverpassword","language":"javascript","views":{"all":{"map":"function(doc) {\nif(doc.type === 'recoverpassword')\t\n  emit(doc.key, doc);\n}"}}},{"_id":"_design/references","language":"javascript","views":{"by_source_document":{"map":"function(doc) {\n  if(doc.type == 'reference'){\n    emit(doc.sourceDocument, doc);\n  } \n}"},"by_target_document":{"map":"function(doc) {\n  if(doc.type == 'reference'){\n    emit(doc.targetDocument, doc);\n  } \n}"},"all":{"map":"function(doc) {\nif(doc.type === 'reference')\t\n  emit(doc._id, doc);\n}"},"count_by_relation_type":{"map":"function(doc) {\nif(doc.type === 'reference' && doc.relationtype)\t\n  emit(doc.relationtype, 1);\n}","reduce":"_sum"}}},{"_id":"_design/relationtypes","language":"javascript","views":{"all":{"map":"function(doc) {\nif(doc.type === 'relationtype')\t\n  emit(doc._id, doc);\n}"}}},{"_id":"_design/settings","language":"javascript","views":{"all":{"map":"function(doc) {\nif(doc.type === 'settings')\t\n  emit(doc._id, doc);\n}"}}},{"_id":"_design/templates","language":"javascript","views":{"all":{"map":"function(doc) {\nif(doc.type === 'template')\t\n  emit(doc._id, doc);\n}"}}},{"_id":"_design/thesauris","language":"javascript","views":{"all":{"map":"function(doc) {\nif(doc.type === 'thesauri')\t\n  emit(doc._id, doc);\n}"},"byName":{"map":"function(doc) {\nif(doc.type === 'thesauri')\t\n  emit(doc.name, doc._id);\n}"}}},{"_id":"_design/users","language":"javascript","views":{"users":{"map":"function(doc) {\n  if(doc.type == 'user'){\n    emit(doc.username+doc.password, null);\n  }\n\n}"},"all":{"map":"function(doc) {\nif(doc.type === 'user')\t\n  emit(doc._id, doc);\n}"}}}]}
