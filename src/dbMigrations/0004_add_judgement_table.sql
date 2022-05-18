CREATE TABLE judgement (
    id INT(11) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    identity_id INT(11) UNSIGNED NOT NULL,
    FOREIGN KEY(identity_id) REFERENCES identity(id),
    judgement VARCHAR(255)
)