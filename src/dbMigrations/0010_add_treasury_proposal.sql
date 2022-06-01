CREATE TABLE treasury_proposal (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    submitter INT(11),
    beneficiary INT(11),
    proposedAt TIMESTAMP,
    value BIGINT,
    status VARCHAR(255)
)