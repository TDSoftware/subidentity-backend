CREATE TABLE treasury_proposal (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    councilMotionId BIGINT UNSIGNED,
    FOREIGN KEY (councilMotionId) REFERENCES council_motion(id),
    proposalId INT(11),
    proposedAt BIGINT UNSIGNED,
    FOREIGN KEY (proposedAt) REFERENCES block(id),
    value BIGINT,
    status VARCHAR(255),
    proposedBy INT(11) UNSIGNED,
    FOREIGN KEY (proposedBy) REFERENCES account(id),
    beneficiary INT(11) UNSIGNED,
    FOREIGN KEY (beneficiary) REFERENCES account(id)
)