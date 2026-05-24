Feature: Duplicate id fixture

  @id:fixture.duplicate-id
  Scenario: First scenario
    Given the first scenario uses the id

  @id:fixture.duplicate-id
  Scenario: Second scenario
    Given the second scenario reuses the id
