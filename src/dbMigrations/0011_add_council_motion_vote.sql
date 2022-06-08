CREATE TABLE council_motion_vote (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    block BIGINT UNSIGNED,
    FOREIGN KEY(block) REFERENCES block(id),
    approved BOOLEAN,
    accountId INT(11) UNSIGNED,
    FOREIGN KEY(accountId) REFERENCES account(id)
)