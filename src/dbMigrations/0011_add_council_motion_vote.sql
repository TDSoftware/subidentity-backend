CREATE TABLE council_motion_vote (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    council_motion_id BIGINT UNSIGNED,
    FOREIGN KEY (council_motion_id) REFERENCES council_motion(id),
    block BIGINT UNSIGNED,
    FOREIGN KEY(block) REFERENCES block(id),
    approved BOOLEAN,
    account_id INT(11) UNSIGNED,
    FOREIGN KEY(account_id) REFERENCES account(id)
)