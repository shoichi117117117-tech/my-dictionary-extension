export function parseGermanEntries(rawData, text) {
    let entries = [];
    if (Array.isArray(rawData)) {
      entries = rawData;
    } else if (rawData && Array.isArray(rawData.entries)) {
      entries = rawData.entries;
    }
  
    if (entries.length === 0) {
      return [];
    }
  
    const allMeanings = [];
  
    entries.forEach(entry => {
      const partOfSpeech = entry.partOfSpeech || entry.pos || 'Word';
      
      const definitions = [];
      const examples = [];
      const grammarNotes = [];
  
      if (Array.isArray(entry.senses)) {
        entry.senses.forEach(sense => {
          if (sense.definition) {
            const cleanDef = sense.definition.replace(/<[^>]+>/g, '').trim();
            if (cleanDef) {
              if (cleanDef.toLowerCase().includes('inflection of') || cleanDef.toLowerCase().includes('form of')) {
                if (!grammarNotes.includes(cleanDef)) grammarNotes.push(cleanDef);
              } else {
                if (!definitions.includes(cleanDef)) definitions.push(cleanDef);
              }
            }
          }
  
          if (Array.isArray(sense.subsenses)) {
            sense.subsenses.forEach(sub => {
              if (sub.definition) {
                const cleanSubDef = sub.definition.replace(/<[^>]+>/g, '').trim();
                if (cleanSubDef) {
                  // Treat subsenses as definitions or grammar notes safely
                  if (cleanSubDef.toLowerCase().includes('inflection of') || cleanSubDef.toLowerCase().includes('form of')) {
                    if (!grammarNotes.includes(cleanSubDef)) grammarNotes.push(cleanSubDef);
                  } else {
                    if (!definitions.includes(cleanSubDef)) definitions.push(cleanSubDef);
                  }
                }
              }
            });
          }
  
          if (Array.isArray(sense.examples)) {
            sense.examples.forEach(ex => {
              const cleanEx = typeof ex === 'string' 
                ? ex.replace(/<[^>]+>/g, '').trim() 
                : (ex.text ? ex.text.replace(/<[^>]+>/g, '').trim() : '');
              if (cleanEx && !examples.includes(cleanEx)) {
                examples.push(cleanEx);
              }
            });
          }
        });
      }
  
      // Fallback: If there are no standard definitions, use grammarNotes as definitions so nothing is empty
      const finalDefinitions = definitions.length > 0 ? definitions : grammarNotes;
  
      if (finalDefinitions.length > 0 || grammarNotes.length > 0) {
        allMeanings.push({
          partOfSpeech: partOfSpeech,
          grammarNotes: definitions.length > 0 ? grammarNotes : [],
          definitions: finalDefinitions.length > 0 ? finalDefinitions : grammarNotes,
          examples: examples
        });
      }
    });
  
    return allMeanings;
  }