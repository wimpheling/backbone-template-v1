Feature: Scenario outline fixture

  @id:fixture.scenario-outline
  Scenario Outline: Scenario outlines fail
    Given the value is <value>

    Examples:
      | value |
      | one   |
