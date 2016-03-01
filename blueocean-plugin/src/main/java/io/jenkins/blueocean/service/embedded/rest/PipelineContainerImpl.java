package io.jenkins.blueocean.service.embedded.rest;

import hudson.model.BuildableItem;
import hudson.model.Job;
import hudson.model.TopLevelItem;
import io.jenkins.blueocean.commons.ServiceException;
import io.jenkins.blueocean.rest.model.BluePipeline;
import io.jenkins.blueocean.rest.model.BluePipelineContainer;
import jenkins.branch.MultiBranchProject;
import jenkins.model.Jenkins;
import org.jenkinsci.plugins.workflow.job.WorkflowJob;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

/**
 * @author Vivek Pandey
 */
public class PipelineContainerImpl extends BluePipelineContainer {
    @Override
    public BluePipeline get(String name) {
        TopLevelItem p = Jenkins.getActiveInstance().getItem(name);
        if(p instanceof Job){
            return new PipelineImpl((Job)p);
        }else if (p instanceof MultiBranchProject) {
            return new MultiBranchPipelineImpl((MultiBranchProject) p);
        }

        // TODO: I'm going to turn this into a decorator annotation
        throw new ServiceException.NotFoundException(String.format("Pipeline %s not found", name));
    }

    @Override
    public Iterator<BluePipeline> iterator() {
        List<BuildableItem> items = Jenkins.getActiveInstance().getAllItems(BuildableItem.class);
        List<BluePipeline> pipelines = new ArrayList<>();
        for (BuildableItem item : items) {
            if(item instanceof MultiBranchProject){
                pipelines.add(new MultiBranchPipelineImpl((MultiBranchProject) item));
            }else if(!isMultiBranchProjectJob(item) && item instanceof Job){
                pipelines.add(new PipelineImpl((Job) item));
            }
        }
        return pipelines.iterator();
    }

    private boolean isMultiBranchProjectJob(BuildableItem item){
        return item instanceof WorkflowJob && item.getParent() instanceof MultiBranchProject;
    }

}
