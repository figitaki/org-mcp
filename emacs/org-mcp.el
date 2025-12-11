;;; org-mcp.el --- Org-mode extension for MCP agentic workflows -*- lexical-binding: t; -*-

;; Copyright (C) 2025

;; Author:
;; Version: 0.1.0
;; Package-Requires: ((emacs "27.1") (org "9.0"))
;; Keywords: org, mcp, agents, workflow
;; URL:

;;; Commentary:

;; This package provides an Org-mode extension for managing agentic coding
;; workflows through an MCP server. It includes:
;; - A dashboard view for tasks
;; - Commands for creating and managing tasks
;; - Integration with Claude Code agents

;;; Code:

(require 'org)

;;;; Customization

(defgroup org-mcp nil
  "Org-mode integration with MCP agentic workflows."
  :group 'org
  :prefix "org-mcp-")

(defcustom org-mcp-workflow-file (expand-file-name "workflow.org" user-emacs-directory)
  "Path to the org file for tracking agentic workflows."
  :type 'file
  :group 'org-mcp)

(defcustom org-mcp-daemon-name "org-mcp-daemon"
  "Name of the Emacs daemon for org-mcp."
  :type 'string
  :group 'org-mcp)

;;;; Task Management

(defun org-mcp-create-task (title &optional description)
  "Create a new task with TITLE and optional DESCRIPTION."
  (interactive "sTask title: ")
  ;; TODO: Implement task creation
  ;; This should create a new heading in the workflow org file
  (message "Creating task: %s" title))

(defun org-mcp-list-tasks ()
  "List all tasks from the workflow org file."
  (interactive)
  ;; TODO: Implement task listing
  ;; This should parse the org file and display tasks
  (message "Listing tasks..."))

(defun org-mcp-update-task-status (status)
  "Update the status of the task at point to STATUS."
  (interactive
   (list (completing-read "New status: "
                          '("TODO" "IN-PROGRESS" "DONE" "CANCELLED"))))
  ;; TODO: Implement status update
  ;; This should update the TODO keyword of the current heading
  (message "Updating task status to: %s" status))

;;;; Dashboard

(defun org-mcp-dashboard ()
  "Display the org-mcp task dashboard."
  (interactive)
  ;; TODO: Implement dashboard view
  ;; This should create a buffer showing an overview of all tasks
  (let ((buffer (get-buffer-create "*org-mcp-dashboard*")))
    (with-current-buffer buffer
      (erase-buffer)
      (insert "# Org-MCP Dashboard\n\n")
      (insert "TODO: Implement dashboard view\n"))
    (switch-to-buffer buffer)))

;;;; Agent Integration

(defun org-mcp-spawn-agent ()
  "Spawn a new Claude Code agent instance."
  (interactive)
  ;; TODO: Implement agent spawning
  ;; This should launch a new Claude Code instance tied to a task
  (message "Spawning Claude Code agent..."))

(defun org-mcp-attach-agent-to-task ()
  "Attach a Claude Code agent to the current task."
  (interactive)
  ;; TODO: Implement agent attachment
  (message "Attaching agent to current task..."))

;;;; Mode Definition

(defvar org-mcp-mode-map
  (let ((map (make-sparse-keymap)))
    (define-key map (kbd "C-c m d") #'org-mcp-dashboard)
    (define-key map (kbd "C-c m t") #'org-mcp-create-task)
    (define-key map (kbd "C-c m l") #'org-mcp-list-tasks)
    (define-key map (kbd "C-c m s") #'org-mcp-update-task-status)
    (define-key map (kbd "C-c m a") #'org-mcp-spawn-agent)
    map)
  "Keymap for `org-mcp-mode'.")

;;;###autoload
(define-minor-mode org-mcp-mode
  "Minor mode for org-mcp workflow management."
  :lighter " MCP"
  :keymap org-mcp-mode-map
  :group 'org-mcp)

;;;###autoload
(defun org-mcp-enable ()
  "Enable org-mcp-mode in the workflow org file."
  (interactive)
  (when (string= (buffer-file-name) org-mcp-workflow-file)
    (org-mcp-mode 1)))

(provide 'org-mcp)

;;; org-mcp.el ends here
