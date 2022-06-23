CREATE TABLE councilterm (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    from_block BIGINT UNSIGNED,
    FOREIGN KEY (from_block) REFERENCES block(id),
    to_block BIGINT UNSIGNED,
    FOREIGN KEY (to_block) REFERENCES block(id)
)