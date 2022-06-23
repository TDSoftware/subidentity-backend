CREATE TABLE councilor (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    councilterm_id BIGINT UNSIGNED,
    FOREIGN KEY(councilterm_id) REFERENCES councilterm(id),
    account_id INT(11) UNSIGNED,    
    FOREIGN KEY(account_id) REFERENCES account(id)
)