import * as fs from 'fs';
import * as path from 'path';

describe('Code Requirement Rules', () => {
  const rulesPath = path.join(__dirname, '../.amazonq/rules/code-requirement-rules.md');
  const guidePath = path.join(__dirname, '../.amazonq/guides/debugging-guide.md');

  test('code-requirement-rules.md exists and contains core rules', () => {
    expect(fs.existsSync(rulesPath)).toBe(true);
    
    const content = fs.readFileSync(rulesPath, 'utf8');
    
    // Verify 4 core rules exist
    expect(content).toContain('Add debug logging →');
    expect(content).toContain('Monitor during testing →');
    expect(content).toContain('Clean before completion →');
    expect(content).toContain('Never log secrets →');
    
    // Verify environment check requirement
    expect(content).toContain('process.env.STAGE === \'development\'');
    
    // Verify reference to guide
    expect(content).toContain('Reference: See `.amazonq/guides/debugging-guide.md`');
  });

  test('debugging-guide.md exists with comprehensive examples', () => {
    expect(fs.existsSync(guidePath)).toBe(true);
    
    const content = fs.readFileSync(guidePath, 'utf8');
    
    // Verify basic debug pattern exists
    expect(content).toContain('Basic Pattern');
    expect(content).toContain('if (process.env.STAGE === \'development\')');
    
    // Verify debug categories
    expect(content).toContain('[DEBUG-ENTRY]');
    expect(content).toContain('[DEBUG-STATE]');
    expect(content).toContain('[DEBUG-FLOW]');
    expect(content).toContain('[DEBUG-ERROR]');
    expect(content).toContain('[DEBUG-PERF]');
    
    // Verify platform-specific patterns
    expect(content).toContain('Lambda Function Debug Pattern');
    expect(content).toContain('Frontend Debug Pattern');
    expect(content).toContain('GraphQL Resolver Debug Pattern');
    
    // Verify production safety rules
    expect(content).toContain('Production Safety Rules');
    expect(content).toContain('Never log sensitive data');
  });

  test('reference link accuracy', () => {
    const rulesContent = fs.readFileSync(rulesPath, 'utf8');
    const referencePath = '.amazonq/guides/debugging-guide.md';
    
    // Verify reference link exists in rules
    expect(rulesContent).toContain(referencePath);
    
    // Verify referenced file actually exists
    const actualGuidePath = path.join(__dirname, '..', referencePath);
    expect(fs.existsSync(actualGuidePath)).toBe(true);
  });

  test('debug logging patterns follow established standards', () => {
    const guideContent = fs.readFileSync(guidePath, 'utf8');
    
    // Verify all patterns use proper environment checks
    const patterns = [
      'process.env.STAGE === \'development\'',
      'process.env.NODE_ENV === \'development\''
    ];
    
    let hasEnvironmentCheck = false;
    patterns.forEach(pattern => {
      if (guideContent.includes(pattern)) {
        hasEnvironmentCheck = true;
      }
    });
    
    expect(hasEnvironmentCheck).toBe(true);
    
    // Verify structured logging format
    expect(guideContent).toContain('[DEBUG-');
    expect(guideContent).toContain('console.log');
    
    // Verify no sensitive data logging warnings
    expect(guideContent).toContain('Never log sensitive data');
    expect(guideContent).toContain('passwords, tokens, PII');
  });

  test('integration with existing workflow', () => {
    // Verify rules directory structure
    const rulesDir = path.join(__dirname, '../.amazonq/rules');
    expect(fs.existsSync(rulesDir)).toBe(true);
    
    // Verify guides directory structure  
    const guidesDir = path.join(__dirname, '../.amazonq/guides');
    expect(fs.existsSync(guidesDir)).toBe(true);
    
    // Verify other existing rules still exist
    const testingRulesPath = path.join(rulesDir, 'testing-rules.md');
    const versioningRulesPath = path.join(rulesDir, 'versioning-rules.md');
    const chatRulesPath = path.join(rulesDir, 'chat-rules.md');
    
    expect(fs.existsSync(testingRulesPath)).toBe(true);
    expect(fs.existsSync(versioningRulesPath)).toBe(true);
    expect(fs.existsSync(chatRulesPath)).toBe(true);
  });
});
