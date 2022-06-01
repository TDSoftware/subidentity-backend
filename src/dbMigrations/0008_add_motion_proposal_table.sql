CREATE TABLE motion_proposal (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    proposalHash VARCHAR(255),
    method VARCHAR(255),
    section VARCHAR(255)
)