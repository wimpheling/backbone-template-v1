Feature: Valid adapter fixture scenarios

  @id:fixture.happy-path
  Scenario: Matching steps pass
    Given the first step matches
    Then the second step matches

  @id:fixture.step-mismatch
  Scenario: Renamed implementation step fails
    Given the documented step name

  @id:fixture.missing-step
  Scenario: Missing implementation step fails
    Given the documented step is not implemented

  @id:fixture.extra-step
  Scenario: Extra implementation step fails
    Given the only documented step

  @id:fixture.missing-implementation
  Scenario: Missing implementation fails
    Given the scenario is not implemented

  @id:fixture.extra-implementation
  Scenario: Extra implementation fails
    Given the feature has one implementation
