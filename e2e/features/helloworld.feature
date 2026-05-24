Feature: Hello page

  @id:hello.say-hello
  Scenario: Say hello through the UI
    Given the Rust server is healthy
    And the visitor is on the hello page
    Then they see the default hello message
    When they ask to greet Playwright
    Then they see the Playwright greeting
    And the Playwright input is saved
