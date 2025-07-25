# Contributing to AWS Application Accelerator Framework

Thank you for your interest in contributing to the AWS Application Accelerator Framework! This document provides guidelines and information for contributors.

## 🎯 How to Contribute

We welcome contributions in many forms:
- 🐛 Bug reports and fixes
- ✨ New features and enhancements
- 📚 Documentation improvements
- 🧪 Test coverage improvements
- 💡 Ideas and suggestions

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- AWS CLI configured with appropriate permissions
- AWS CDK v2 installed globally: `npm install -g aws-cdk`
- Git

### Setting Up Development Environment

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/your-username/aws-application-accelerator.git
   cd aws-application-accelerator
   ```

3. **Install dependencies**:
   ```bash
   npm install
   npm run frontend:install
   ```

4. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

5. **Bootstrap CDK** (if testing deployments):
   ```bash
   cdk bootstrap
   ```

## 📋 Development Workflow

### Code Structure

The project follows this structure:
- `lib/` - CDK constructs and infrastructure code
- `lib/utils/` - Utility classes (model parsing, schema generation, etc.)
- `lib/lambda/` - Lambda function implementations
- `models/` - Example model definitions
- `frontend/` - Vue.js frontend application
- `test/` - Test files

### Making Changes

1. **Write tests first** (TDD approach preferred)
2. **Implement your changes**
3. **Ensure tests pass**: `npm test`
4. **Lint your code**: `npm run lint:fix`
5. **Test deployment** (if applicable): `npm run deploy:with-frontend`

### Code Style

- **TypeScript**: Use strict TypeScript with proper typing
- **ESLint**: Follow the existing ESLint configuration
- **Formatting**: Use consistent formatting (Prettier recommended)
- **Comments**: Add JSDoc comments for public APIs
- **Naming**: Use descriptive names for variables and functions

### Testing

We use Jest for testing. Please ensure:
- **Unit tests** for all utility functions
- **Integration tests** for CDK constructs
- **Test coverage** should not decrease
- **Mock external dependencies** appropriately

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- security.test.ts
```

## 🐛 Reporting Bugs

When reporting bugs, please include:

1. **Clear description** of the issue
2. **Steps to reproduce** the problem
3. **Expected behavior** vs actual behavior
4. **Environment details**:
   - Node.js version
   - AWS CDK version
   - AWS region
   - Operating system
5. **Error messages** and stack traces
6. **Model definitions** (if relevant)

### Bug Report Template

```markdown
## Bug Description
Brief description of the bug

## Steps to Reproduce
1. Step one
2. Step two
3. Step three

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- Node.js version: 
- CDK version: 
- AWS region: 
- OS: 

## Additional Context
Any other relevant information
```

## ✨ Suggesting Features

For feature requests, please:

1. **Check existing issues** to avoid duplicates
2. **Describe the use case** clearly
3. **Explain the benefit** to users
4. **Consider implementation complexity**
5. **Provide examples** if possible

### Feature Request Template

```markdown
## Feature Description
Clear description of the proposed feature

## Use Case
Why is this feature needed?

## Proposed Solution
How should this feature work?

## Alternatives Considered
Other approaches you've considered

## Additional Context
Any other relevant information
```

## 📝 Pull Request Process

### Before Submitting

- [ ] Tests pass locally
- [ ] Code follows style guidelines
- [ ] Documentation is updated
- [ ] CHANGELOG.md is updated (if applicable)
- [ ] No merge conflicts with main branch

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Code refactoring

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests pass
```

### Review Process

1. **Automated checks** must pass (CI/CD pipeline)
2. **Code review** by maintainers
3. **Testing** in development environment
4. **Approval** and merge

## 🏗️ Architecture Guidelines

### CDK Constructs

- **Reusable constructs** should be in `lib/constructs/`
- **Follow CDK best practices** for construct design
- **Use proper IAM permissions** (principle of least privilege)
- **Include CloudFormation outputs** for important resources

### Lambda Functions

- **Keep functions small** and focused
- **Use TypeScript** for type safety
- **Include proper error handling**
- **Add structured logging**
- **Optimize for cold starts**

### GraphQL Schema

- **Follow GraphQL best practices**
- **Use consistent naming conventions**
- **Include proper descriptions**
- **Consider pagination** for list operations

### Security

- **Never commit secrets** or credentials
- **Use AWS Secrets Manager** for sensitive data
- **Implement proper authorization** checks
- **Follow AWS security best practices**

## 📚 Documentation

### Code Documentation

- **JSDoc comments** for all public APIs
- **README updates** for new features
- **Inline comments** for complex logic
- **Type definitions** with descriptions

### User Documentation

- **Update README.md** for user-facing changes
- **Add examples** for new features
- **Update architecture diagrams** if needed
- **Include migration guides** for breaking changes

## 🧪 Testing Strategy

### Unit Tests

- Test individual functions and classes
- Mock external dependencies
- Focus on edge cases and error conditions
- Aim for high code coverage

### Integration Tests

- Test CDK construct synthesis
- Verify resource creation
- Test cross-service interactions
- Use CDK assertions library

### End-to-End Tests

- Test complete workflows
- Use real AWS resources (in test environment)
- Verify frontend-backend integration
- Test authentication flows

## 🚀 Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Checklist

- [ ] All tests pass
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Version bumped in package.json
- [ ] Git tag created
- [ ] Release notes prepared

## 🤝 Community Guidelines

### Code of Conduct

- **Be respectful** and inclusive
- **Help others** learn and grow
- **Give constructive feedback**
- **Focus on the code**, not the person
- **Assume good intentions**

### Communication

- **GitHub Issues** for bug reports and feature requests
- **GitHub Discussions** for questions and ideas
- **Pull Request comments** for code-specific discussions
- **Be patient** with response times

## 📞 Getting Help

If you need help:

1. **Check the documentation** first
2. **Search existing issues** for similar problems
3. **Create a new issue** with detailed information
4. **Join GitHub Discussions** for community support

## 🙏 Recognition

Contributors will be recognized in:
- **CONTRIBUTORS.md** file
- **Release notes** for significant contributions
- **GitHub contributors** section

Thank you for contributing to the AWS Application Accelerator Framework! Your contributions help make AWS development more accessible to everyone. 🚀
