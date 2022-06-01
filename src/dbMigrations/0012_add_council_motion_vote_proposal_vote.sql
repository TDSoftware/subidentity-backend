CREATE TABLE council_motion_proposal_vote (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    block INT(11),
    FOREIGN KEY(block) REFERENCES block(number),
    voteUp BOOLEAN,
    accountId INT(11) UNSIGNED,
    FOREIGN KEY(accountId) REFERENCES account(id)
)